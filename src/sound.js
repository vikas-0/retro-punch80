export function createSoundEngine() {
  let context;
  let output;
  let noiseBuffer;

  function createNoiseBuffer(audio) {
    const duration = 0.4;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const samples = buffer.getChannelData(0);

    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function createOutput(audio) {
    const master = audio.createGain();
    const compressor = audio.createDynamicsCompressor();

    master.gain.setValueAtTime(0.82, audio.currentTime);
    compressor.threshold.setValueAtTime(-18, audio.currentTime);
    compressor.knee.setValueAtTime(12, audio.currentTime);
    compressor.ratio.setValueAtTime(7, audio.currentTime);
    compressor.attack.setValueAtTime(0.002, audio.currentTime);
    compressor.release.setValueAtTime(0.08, audio.currentTime);

    master.connect(compressor).connect(audio.destination);
    return master;
  }

  function getContext() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      output = createOutput(context);
      noiseBuffer = createNoiseBuffer(context);
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    return context;
  }

  function shapeEnvelope(gain, start, peak, duration, attack = 0.0015) {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  }

  function oscillatorLayer(audio, {
    start,
    frequency,
    endFrequency,
    duration,
    volume,
    type = "triangle",
  }) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    shapeEnvelope(gain, start, volume, duration);

    oscillator.connect(gain).connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.005);
  }

  function noiseLayer(audio, {
    start,
    duration,
    volume,
    filterType,
    frequency,
    q = 0.8,
  }) {
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(q, start);
    shapeEnvelope(gain, start, volume, duration, 0.0008);

    source.connect(filter).connect(gain).connect(output);
    const maxOffset = Math.max(0, noiseBuffer.duration - duration - 0.01);
    source.start(start, Math.random() * maxOffset, duration);
    source.stop(start + duration + 0.005);
  }

  function tone(frequency, duration, volume, type = "square", slide = 0) {
    const audio = getContext();
    if (!audio) return;
    const start = audio.currentTime + 0.001;

    oscillatorLayer(audio, {
      start,
      frequency,
      endFrequency: frequency + slide,
      duration,
      volume,
      type,
    });
  }

  function punch() {
    const audio = getContext();
    if (!audio) return;

    const start = audio.currentTime + 0.002;
    const variation = 0.96 + Math.random() * 0.08;

    // Cardstock and punch-die impact.
    oscillatorLayer(audio, {
      start,
      frequency: 118 * variation,
      endFrequency: 62 * variation,
      duration: 0.052,
      volume: 0.14,
      type: "triangle",
    });

    // Fast solenoid snap.
    oscillatorLayer(audio, {
      start,
      frequency: 1650 * variation,
      endFrequency: 820 * variation,
      duration: 0.015,
      volume: 0.028,
      type: "square",
    });

    // Broadband tearing/cutting transient from the card stock.
    noiseLayer(audio, {
      start,
      duration: 0.026,
      volume: 0.13,
      filterType: "highpass",
      frequency: 680 * variation,
    });

    // Brief metal return ringing after the die retracts.
    noiseLayer(audio, {
      start: start + 0.011,
      duration: 0.043,
      volume: 0.045,
      filterType: "bandpass",
      frequency: 2450 * variation,
      q: 2.4,
    });
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
