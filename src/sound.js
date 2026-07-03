export function createSoundEngine() {
  let context;

  function getContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === "suspended") context.resume();
    return context;
  }

  function tone(frequency, duration, volume, type = "square", slide = 0) {
    const audio = getContext();
    if (!audio) return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function punch() {
    tone(92, 0.045, 0.12, "square", -22);
    tone(1300, 0.018, 0.035, "triangle", -500);
  }

  function feed() {
    tone(74, 0.16, 0.065, "sawtooth", 28);
    window.setTimeout(() => tone(64, 0.09, 0.05, "square", -12), 80);
  }

  function read() {
    tone(860, 0.05, 0.035, "sine", 180);
  }

  function ready() {
    tone(420, 0.08, 0.045, "sine", 90);
    window.setTimeout(() => tone(620, 0.1, 0.045, "sine", 80), 80);
  }

  return { punch, feed, read, ready };
}
