
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Initialize purely on user interaction to handle browser autoplay policies
  }

  // Must be called on first user interaction (Start Game)
  public init() {
    if (!this.ctx) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, startTime: number, volume: number = 0.1) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public playClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // High pitched blip
    this.createOscillator('sine', 800, 0.1, now, 0.05);
  }

  public playCorrect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Major 3rd chord (C5 - E5)
    this.createOscillator('sine', 523.25, 0.3, now, 0.1);
    this.createOscillator('sine', 659.25, 0.3, now + 0.05, 0.1);
  }

  public playIncorrect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Low dissonant sawtooth
    this.createOscillator('sawtooth', 150, 0.3, now, 0.05);
    this.createOscillator('sawtooth', 140, 0.3, now + 0.05, 0.05);
  }

  public playStreak() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Rapid ascending arpeggio
    this.createOscillator('sine', 440, 0.1, now, 0.05);
    this.createOscillator('sine', 554, 0.1, now + 0.05, 0.05);
    this.createOscillator('sine', 659, 0.1, now + 0.10, 0.05);
    this.createOscillator('sine', 880, 0.4, now + 0.15, 0.05);
  }

  public playBonusStart() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Sweep up (Siren/Charge up effect)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(800, now + 1.0); // Rise over 1s
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 1.0);
  }

  public playBonusSuccess() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Jackpot coins effect
    for(let i = 0; i < 5; i++) {
        this.createOscillator('square', 880 + (i * 100), 0.1, now + (i * 0.08), 0.03);
    }
    this.createOscillator('sine', 440, 1.0, now, 0.1); // Fundamental
  }

  public playBonusFail() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Sad descending slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
