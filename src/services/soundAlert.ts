/**
 * Instant Audio Notification for Real-time Trading Signals
 * Uses native Web Audio API for zero-latency, high-fidelity chimes without external assets.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

export function toggleAudioEnabled(): boolean {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

export function setAudioEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function playSignalAlertSound(isBuy = true) {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic pleasant chime (Trading terminal style)
    const baseFreq = isBuy ? 587.33 : 659.25; // D5 (Buy) or E5 (Sell)
    const secondFreq = isBuy ? 880.0 : 440.0; // A5 (higher) or A4 (lower)

    // Oscillator 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(secondFreq, now + 0.18);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.55);

    // Oscillator 2 (Harmonic overtone)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.10, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.60);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.60);
  } catch {
    // Gracefully ignore audio restrictions if user hasn't interacted with page yet
  }
}
