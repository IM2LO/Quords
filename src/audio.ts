import { midiNoteName } from './music';
import type { TimelineNote } from './model';

export type SynthTone = 'soft' | 'bright' | 'organ';
export const SYNTH_TONES: Record<SynthTone, string> = { soft: 'Doux', bright: 'Clair', organ: 'Orgue' };
export type AudioStep = { midis: number[]; beats: number; velocity?: number; gate?: number };
type Voice = { source: OscillatorNode; gain: GainNode; startsAt: number };

function hold(param: AudioParam, time: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
  else { const value = param.value; param.cancelScheduledValues(time); param.setValueAtTime(value,time); }
}

/** Oscillators only: no fetch, samples, decoding, compressor look-ahead or audio work on the DOM path. */
export class PianoAudioEngine extends EventTarget {
  private context?: AudioContext;
  private output?: GainNode;
  private waves = new Map<SynthTone, PeriodicWave>();
  private voices = new Set<Voice>();
  private timer?: ReturnType<typeof setInterval>;
  private frame?: number;
  private generation = 0;
  private finished?: () => void;
  tone: SynthTone = 'soft';
  volume = 0.7;
  status = 'Synthèse directe · aucun sample';

  private setStatus(value: string): void {
    if (this.status === value) return;
    this.status = value;
    this.dispatchEvent(new Event('status'));
  }

  private getContext(): AudioContext | undefined {
    if (this.context) return this.context;
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) { this.setStatus('Audio indisponible dans ce navigateur'); return; }
    try {
      const context = new Context({ latencyHint: 'interactive' });
      this.context = context;
      this.output = context.createGain();
      this.output.gain.value = this.volume;
      // Memoryless soft limiting, without look-ahead or oversampling delay.
      const limiter = context.createWaveShaper();
      limiter.curve = Float32Array.from({length:2049}, (_, index) => Math.tanh((index / 1024 - 1) * 1.3) / 1.3);
      limiter.oversample = 'none';
      this.output.connect(limiter).connect(context.destination);
      const harmonics: Record<SynthTone, number[]> = {
        soft: [0, 1, 0.13, 0.07, 0.025],
        bright: [0, 1, 0.38, 0.2, 0.1, 0.055, 0.025],
        organ: [0, 1, 0.45, 0.18, 0.3, 0.05, 0.1],
      };
      for (const tone of Object.keys(harmonics) as SynthTone[]) {
        const imaginary = new Float32Array(harmonics[tone]);
        this.waves.set(tone, context.createPeriodicWave(new Float32Array(imaginary.length), imaginary));
      }
      context.onstatechange = () => this.setStatus(context.state === 'running' ? 'Synthèse active · aucun sample' : 'Touche le clavier pour activer le son');
      return context;
    } catch { this.setStatus('Impossible d’activer la synthèse audio'); return; }
  }

  unlock(): void {
    const context = this.getContext();
    if (context && context.state !== 'running') void context.resume().catch(() => this.setStatus('Touche le clavier pour activer le son'));
    else if (context) this.setStatus('Synthèse active · aucun sample');
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.output) this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
  }

  private voice(midi: number, time: number, duration: number, velocity: number): () => void {
    const context = this.context!;
    if (!Number.isFinite(midi) || midi < 0 || midi > 127) return () => {};
    // Bound CPU even under repeated clicks or a very long held chord.
    if (this.voices.size >= 64) {
      const oldest = this.voices.values().next().value!;
      oldest.source.stop(context.currentTime);
      this.voices.delete(oldest);
    }
    const source = context.createOscillator();
    const gain = context.createGain();
    const peak = 0.11 * Math.max(0, Math.min(1, velocity));
    source.setPeriodicWave(this.waves.get(this.tone)!);
    source.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    // A 2 ms attack avoids clicks; no sample-dependent onset or slow fade-in.
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.002);
    gain.gain.setTargetAtTime(peak * (this.tone === 'organ' ? 0.9 : 0.65), time + 0.002, 0.12);
    gain.gain.setTargetAtTime(0, time + duration, 0.018);
    source.connect(gain).connect(this.output!);
    const voice = {source, gain, startsAt:time};
    this.voices.add(voice);
    source.onended = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); };
    source.start(time);
    source.stop(time + duration + 0.12);
    let released = false;
    return () => {
      if (released || !this.voices.has(voice)) return;
      released = true;
      const now = context.currentTime;
      hold(gain.gain,now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      source.stop(now + 0.1);
    };
  }

  play(midi: number, when?: number, duration = 1.5): () => void {
    this.unlock();
    if (!this.context || !this.output) return () => {};
    return this.voice(midi, when ?? this.context.currentTime, duration, 0.85);
  }

  playTogether(midis: readonly number[], duration = 1.5, velocity = 0.8): void {
    this.unlock();
    if (!this.context || !this.output) return;
    // One timestamp per chord, NOT a new currentTime read for each voice.
    // One render quantum of headroom ensures all nodes reach the audio thread together.
    const time = this.context.currentTime + 128 / this.context.sampleRate;
    midis.forEach(midi => this.voice(midi, time, duration, velocity));
  }

  async playTimeline(notes: TimelineNote[], bpm: number, startBeat: number, endBeat: number, loop: boolean, metronome: boolean, pulse: number, bar: number, onPosition: (beat: number) => void, onEnd: () => void): Promise<void> {
    this.stopAll();
    const generation = this.generation;
    this.finished = onEnd;
    const context = this.getContext();
    if (!context || !Number.isFinite(bpm) || bpm <= 0 || endBeat <= startBeat) { this.stopAll(); return; }
    try { if (context.state !== 'running') await context.resume(); }
    catch { this.setStatus('Touche le clavier pour activer le son'); this.stopAll(); return; }
    if (generation !== this.generation) return;
    this.setStatus('Synthèse active · aucun sample');
    const seconds = 60 / bpm;
    const length = (endBeat - startBeat) * seconds;
    const events = notes.filter(n => n.at < endBeat && n.at + n.duration > startBeat).map(n => ({
      midi: n.midi, at: (Math.max(startBeat, n.at) - startBeat) * seconds,
      duration: (Math.min(endBeat, n.at + n.duration) - Math.max(startBeat, n.at)) * seconds, velocity: n.velocity,
    }));
    if (metronome) for (let beat = Math.ceil(startBeat / pulse) * pulse; beat < endBeat; beat += pulse) {
      events.push({ midi: Math.abs(beat % bar) < .001 ? 96 : 89, at: (beat - startBeat) * seconds, duration: .035, velocity: .45 });
    }
    events.sort((a,b) => a.at - b.at);
    let origin = context.currentTime + 128 / context.sampleRate;
    let cycle = 0, index = 0;
    const schedule = () => {
      const now = context.currentTime;
      // After a throttled background tab, skip expired notes instead of creating a burst.
      while (events.length && origin + cycle * length + events[index].at < now + .12) {
        const event = events[index], time = origin + cycle * length + event.at;
        if (time >= now - .025) this.voice(event.midi, Math.max(time, now), event.duration, event.velocity);
        index++;
        if (index === events.length) { index = 0; cycle++; if (!loop) break; }
        if (!loop && cycle > 0) break;
      }
    };
    const paint = () => {
      if (generation !== this.generation) return;
      const elapsed = Math.max(0, context.currentTime - origin);
      if (!loop && elapsed >= length) { this.stopAll(); onPosition(startBeat); return; }
      onPosition(startBeat + (elapsed % length) / seconds);
      this.frame = requestAnimationFrame(paint);
    };
    schedule();
    this.timer = setInterval(() => { if (loop || cycle === 0) schedule(); }, 20);
    paint();
  }

  stopAll(): void {
    this.generation += 1;
    clearInterval(this.timer);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    const now = this.context?.currentTime ?? 0;
    for (const {source,gain,startsAt} of this.voices) {
      hold(gain.gain,now);
      gain.gain.setTargetAtTime(0, now, 0.008);
      source.stop(startsAt > now ? now : now + 0.05);
    }
    this.voices.clear();
    const finished = this.finished; this.finished = undefined;
    finished?.();
  }
}

export function accessibleKeyLabel(midi: number, notation: 'latin' | 'international', selecting: boolean): string {
  return (selecting ? 'Sélectionner' : 'Jouer') + ' ' + midiNoteName(midi, notation);
}
