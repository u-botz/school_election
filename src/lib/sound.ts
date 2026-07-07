export function playSuccessBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    // C major arpeggio: C5 → E5 → G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const start = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.start(start);
      osc.stop(start + 0.5);
    });
  } catch {
    // Web Audio not supported — fail silently
  }
}
