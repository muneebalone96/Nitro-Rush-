/**
 * Web Audio API procedural synthesizer for Nitro Rush: Street Legends.
 * Generates realistic high-octane engine revs, turbo spool, nitro roar, tire screech,
 * UI sound effects, and dynamic synthwave background music without external audio files.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private soundEnabled = true;
  private musicEnabled = true;
  private soundVolume = 0.8;
  private musicVolume = 0.5;

  // Master Gain Nodes
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine Synthesizer Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning = false;

  // Nitro Thruster Nodes
  private nitroNoiseNode: AudioNode | null = null;
  private nitroGain: GainNode | null = null;
  private isNitroPlaying = false;

  // Tire Screech Nodes
  private tireNoiseNode: AudioNode | null = null;
  private tireGain: GainNode | null = null;
  private isTireScreeching = false;

  // Music Sequencer state
  private musicTimer: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.soundVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public updateConfig(soundEnabled: boolean, musicEnabled: boolean, soundVol: number, musicVol: number) {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    this.soundVolume = soundVol;
    this.musicVolume = musicVol;

    if (this.ctx && this.sfxGain && this.musicGain) {
      const sfxTarget = soundEnabled ? soundVol : 0;
      const musicTarget = musicEnabled ? musicVol : 0;
      this.sfxGain.gain.setTargetAtTime(sfxTarget, this.ctx.currentTime, 0.05);
      this.musicGain.gain.setTargetAtTime(musicTarget, this.ctx.currentTime, 0.05);
    }

    if (!musicEnabled && this.isMusicPlaying) {
      this.stopMusic();
    }
  }

  // --- ENGINE SYNTHESIZER ---
  public startEngine() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isEngineRunning || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;

      // Osc 1: Deep low rumble (Sawtooth)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(55, now);

      // Osc 2: Mid grit harmonics (Triangle / Square blend)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'square';
      this.engineOsc2.frequency.setValueAtTime(110, now);

      // Lowpass filter that opens up with RPM
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, now);
      this.engineFilter.Q.setValueAtTime(3.5, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.18, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
      this.isEngineRunning = true;
    } catch {
      // Ignored
    }
  }

  public updateEngineRPM(speedKmh: number, maxSpeedKmh: number, isAccelerating: boolean, isBraking: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const speedRatio = Math.max(0, Math.min(1, speedKmh / Math.max(1, maxSpeedKmh)));

    // Gear simulation (5 gears)
    const gearCount = 5;
    const gearProgress = (speedRatio * gearCount) % 1;
    const gearIndex = Math.floor(speedRatio * (gearCount - 0.01));

    const baseFreq = 50 + (gearIndex * 12) + (gearProgress * 95) + (isAccelerating ? 30 : 0);
    const filterFreq = 300 + (speedRatio * 1800) + (isAccelerating ? 600 : (isBraking ? -100 : 0));
    const targetVolume = isAccelerating ? 0.26 : (speedKmh > 5 ? 0.16 : 0.08);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(Math.max(150, filterFreq), now, 0.06);
    this.engineGain.gain.setTargetAtTime(this.soundEnabled ? targetVolume : 0, now, 0.08);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc1) {
        this.engineOsc1.stop();
        this.engineOsc1.disconnect();
      }
      if (this.engineOsc2) {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
      }
    } catch {
      // Ignore
    }
    this.isEngineRunning = false;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
  }

  // --- NITRO SOUND ---
  public startNitro() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isNitroPlaying || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      // White noise buffer for roaring exhaust jet
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass filter for jet engine roar
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
      filter.Q.setValueAtTime(2.0, now);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.01, now);
      this.nitroGain.gain.linearRampToValueAtTime(0.35, now + 0.1);

      whiteNoise.connect(filter);
      filter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);

      // Add high frequency sci-fi laser tone
      const toneOsc = this.ctx.createOscillator();
      toneOsc.type = 'sine';
      toneOsc.frequency.setValueAtTime(440, now);
      toneOsc.frequency.exponentialRampToValueAtTime(980, now + 0.4);
      const toneGain = this.ctx.createGain();
      toneGain.gain.setValueAtTime(0.08, now);
      toneOsc.connect(toneGain);
      toneGain.connect(this.nitroGain);

      whiteNoise.start(now);
      toneOsc.start(now);

      this.nitroNoiseNode = whiteNoise;
      this.isNitroPlaying = true;
    } catch {
      // Ignored
    }
  }

  public stopNitro() {
    if (!this.isNitroPlaying || !this.ctx || !this.nitroGain) return;
    try {
      const now = this.ctx.currentTime;
      this.nitroGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      setTimeout(() => {
        if (this.nitroNoiseNode && 'stop' in this.nitroNoiseNode) {
          (this.nitroNoiseNode as AudioScheduledSourceNode).stop();
          this.nitroNoiseNode.disconnect();
        }
        this.isNitroPlaying = false;
        this.nitroNoiseNode = null;
        this.nitroGain = null;
      }, 200);
    } catch {
      this.isNitroPlaying = false;
    }
  }

  // --- TIRE SCREECH / DRIFT SOUND ---
  public startTireScreech(intensity = 0.5) {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    if (this.isTireScreeching && this.tireGain) {
      const now = this.ctx.currentTime;
      this.tireGain.gain.setTargetAtTime(Math.min(0.25, intensity * 0.25), now, 0.05);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(5.0, now);

      this.tireGain = this.ctx.createGain();
      this.tireGain.gain.setValueAtTime(0.01, now);
      this.tireGain.gain.linearRampToValueAtTime(Math.min(0.25, intensity * 0.25), now + 0.05);

      whiteNoise.connect(filter);
      filter.connect(this.tireGain);
      this.tireGain.connect(this.sfxGain);

      whiteNoise.start(now);
      this.tireNoiseNode = whiteNoise;
      this.isTireScreeching = true;
    } catch {
      // Ignored
    }
  }

  public stopTireScreech() {
    if (!this.isTireScreeching || !this.ctx || !this.tireGain) return;
    try {
      const now = this.ctx.currentTime;
      this.tireGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      setTimeout(() => {
        if (this.tireNoiseNode && 'stop' in this.tireNoiseNode) {
          (this.tireNoiseNode as AudioScheduledSourceNode).stop();
          this.tireNoiseNode.disconnect();
        }
        this.isTireScreeching = false;
        this.tireNoiseNode = null;
        this.tireGain = null;
      }, 100);
    } catch {
      this.isTireScreeching = false;
    }
  }

  // --- SOUND EFFECTS ---
  public playCountdownBeep(isGo = false) {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
      }

      gain.gain.setValueAtTime(isGo ? 0.35 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + (isGo ? 0.6 : 0.25));
    } catch {
      // Ignored
    }
  }

  public playCollisionSound(intensity = 0.5) {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(Math.min(0.4, intensity * 0.4), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignored
    }
  }

  public playCoinSound() {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1975.53, now);
      osc2.frequency.setValueAtTime(2637.02, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {
      // Ignored
    }
  }

  public playUpgradeSound() {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.06);

        noteGain.gain.setValueAtTime(0, now + idx * 0.06);
        noteGain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        noteOsc.connect(noteGain);
        noteGain.connect(this.sfxGain);

        noteOsc.start(now + idx * 0.06);
        noteOsc.stop(now + idx * 0.06 + 0.25);
      });
    } catch {
      // Ignored
    }
  }

  public playButtonClick() {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignored
    }
  }

  public playVictoryFanfare() {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;

    try {
      const chords = [
        [523.25, 659.25, 783.99], // C
        [587.33, 739.99, 880.00], // D
        [659.25, 830.61, 987.77], // E
        [1046.50, 1318.51, 1567.98], // High C
      ];
      const now = this.ctx.currentTime;
      chords.forEach((chord, i) => {
        const time = now + i * 0.18;
        const duration = i === chords.length - 1 ? 0.8 : 0.16;
        chord.forEach((freq) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.15, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(time);
          osc.stop(time + duration);
        });
      });
    } catch {
      // Ignored
    }
  }

  // --- SYNTHWAVE RACING MUSIC SEQUENCER ---
  public startMusic(bpm = 130) {
    this.init();
    if (!this.musicEnabled || this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    const stepInterval = (60 / bpm / 4) * 1000; // 16th notes

    // Bass notes progression: Am - F - C - G
    const bassScale = [110, 110, 87.31, 87.31, 65.41, 65.41, 98.00, 98.00];
    const arpeggioNotes = [220, 261.63, 329.63, 440, 523.25, 659.25];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled) return;

      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      const bar = Math.floor(this.musicStep / 16) % 4;

      // Kick drum on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(130, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);
        kickGain.gain.setValueAtTime(0.3, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.12);
      }

      // Snare on beats 4, 12
      if (step === 4 || step === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(220, now);
        snareGain.gain.setValueAtTime(0.18, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareOsc.start(now);
        snareOsc.stop(now + 0.1);
      }

      // Hi-hat on every 2nd step
      if (step % 2 === 1) {
        const hihatOsc = this.ctx.createOscillator();
        const hihatGain = this.ctx.createGain();
        hihatOsc.type = 'square';
        hihatOsc.frequency.setValueAtTime(7000 + Math.random() * 2000, now);
        hihatGain.gain.setValueAtTime(0.04, now);
        hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        hihatOsc.connect(hihatGain);
        hihatGain.connect(this.musicGain);
        hihatOsc.start(now);
        hihatOsc.stop(now + 0.03);
      }

      // Rolling Bassline
      const bassFreq = bassScale[(bar * 2 + Math.floor(step / 8)) % bassScale.length];
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bassNoteGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, now);

        bassNoteGain.gain.setValueAtTime(0.18, now);
        bassNoteGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassNoteGain);
        bassNoteGain.connect(this.musicGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.11);
      }

      // Synth Arpeggio
      if (step % 2 === 0) {
        const arpNote = arpeggioNotes[(step * 2 + bar) % arpeggioNotes.length];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(arpNote, now);

        arpGain.gain.setValueAtTime(0.07, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain);

        arpOsc.start(now);
        arpOsc.stop(now + 0.08);
      }

      this.musicStep++;
    }, stepInterval);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.isMusicPlaying = false;
  }
}

export const audioEngine = new AudioEngine();
