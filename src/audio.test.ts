import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PianoAudioEngine } from './audio';
import type { TimelineNote } from './model';

const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelAndHoldAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
class FakeContext {
  static last: FakeContext;
  state = 'running'; currentTime = 10; sampleRate = 48000; destination = {}; onstatechange = null;
  sources: any[] = []; gains: any[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  constructor(public options: unknown) { FakeContext.last = this; }
  createGain() { const gain = { gain: param(), connect: vi.fn((node: unknown) => node), disconnect: vi.fn() }; this.gains.push(gain); return gain; }
  createWaveShaper() { return { connect: vi.fn(), curve: undefined, oversample: 'none' }; }
  createPeriodicWave() { return {}; }
  createOscillator() {
    const node = { frequency: { value: 0 }, setPeriodicWave: vi.fn(), connect: vi.fn((n: unknown) => n), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: undefined };
    this.sources.push(node); return node;
  }
}
const note = (midi: number, at = 0, duration = 1): TimelineNote => ({ id: String(midi), clipId: 'c', track: 'chords', midi, at, duration, velocity: .8 });
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { AudioContext: FakeContext });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Synthèse directe et horloge commune', () => {
  it('utilise une latence interactive et un seul instant pour toutes les voix', () => {
    const engine = new PianoAudioEngine(); engine.playTogether([48, 52, 55, 59]);
    const ctx = FakeContext.last;
    expect(ctx.options).toEqual({ latencyHint: 'interactive' });
    expect(new Set(ctx.sources.map(s => s.start.mock.calls[0][0])).size).toBe(1);
    expect(ctx.sources[0].start.mock.calls[0][0]).toBeCloseTo(10 + 128 / 48000);
    expect(ctx.sources.map(s => s.frequency.value)).toEqual([48, 52, 55, 59].map(n => 440 * 2 ** ((n - 69) / 12)));
    engine.stopAll();
  });
  it('déclenche une touche immédiatement sans délai de chargement', () => {
    const engine = new PianoAudioEngine(); const release = engine.play(60);
    expect(FakeContext.last.sources[0].start).toHaveBeenCalledWith(10);
    release(); release();
    expect(FakeContext.last.sources[0].stop).toHaveBeenCalledTimes(2);
  });
  it('programme les accords simultanément et les notes ultérieures à l’avance', async () => {
    const engine = new PianoAudioEngine();
    await engine.playTimeline([note(48), note(52), note(55), note(60, 1)], 120, 0, 4, false, false, 1, 4, vi.fn(), vi.fn());
    const ctx = FakeContext.last;
    expect(ctx.sources).toHaveLength(3);
    expect(new Set(ctx.sources.map(s => s.start.mock.calls[0][0])).size).toBe(1);
    ctx.currentTime = 10.45; vi.advanceTimersByTime(20);
    expect(ctx.sources).toHaveLength(4);
    expect(ctx.sources[3].start.mock.calls[0][0]).toBeCloseTo(10 + 128 / 48000 + .5);
    ctx.currentTime = 12; vi.advanceTimersByTime(100);
    expect(ctx.sources).toHaveLength(4);
    engine.stopAll();
  });
  it('coupe la lecture et les notes déjà programmées quand on arrête', async () => {
    const engine = new PianoAudioEngine(), end = vi.fn();
    await engine.playTimeline([note(60)], 120, 0, 4, true, false, 1, 4, vi.fn(), end);
    const ctx = FakeContext.last;
    engine.stopAll();
    expect(end).toHaveBeenCalledTimes(1);
    const count = ctx.sources.length; ctx.currentTime = 20; vi.advanceTimersByTime(1000);
    expect(ctx.sources).toHaveLength(count);
    expect(ctx.sources[0].stop).toHaveBeenLastCalledWith(10);
  });
  it('ne démarre pas une lecture annulée pendant le déverrouillage audio', async () => {
    const engine = new PianoAudioEngine(); engine.unlock();
    const ctx = FakeContext.last; ctx.state = 'suspended';
    let resolve!: () => void;
    ctx.resume = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    const pending = engine.playTimeline([note(60)], 120, 0, 4, false, false, 1, 4, vi.fn(), vi.fn());
    engine.stopAll(); resolve(); await pending;
    expect(ctx.sources).toHaveLength(0);
  });
  it('recommence exactement au début de la région de boucle', async () => {
    const engine = new PianoAudioEngine();
    await engine.playTimeline([note(60, 0, 4)], 120, 1, 2, true, false, 1, 4, vi.fn(), vi.fn());
    const ctx = FakeContext.last;
    expect(ctx.sources).toHaveLength(1);
    ctx.currentTime = 10.45; vi.advanceTimersByTime(20);
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources[1].start.mock.calls[0][0] - ctx.sources[0].start.mock.calls[0][0]).toBeCloseTo(.5);
    engine.stopAll();
  });
});
