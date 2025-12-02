
// Retro Audio Engine using Web Audio API
// Generates sounds and music procedurally without external assets

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let sequencerInterval: number | null = null;
let currentNoteIndex = 0;

// Musical Constants
const TEMPO = 120;
const NOTE_LENGTH = 60 / TEMPO / 4; // 16th notes
const SCALES = {
  minor: [0, 3, 7, 10, 12], // Minor Pentatonic
  danger: [0, 1, 6, 7, 12]  // Phrygian-ish
};

const BASE_FREQ = 55; // A1

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (audioCtx && masterGain) {
        masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.3, audioCtx.currentTime, 0.1);
    }
    return isMuted;
};

// Sound Effects
export const playSound = (type: 'shoot' | 'explode' | 'build' | 'sell' | 'error' | 'success' | 'start' | 'win' | 'lose' | 'ui') => {
  if (!audioCtx || isMuted) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain!);

  switch (type) {
    case 'shoot':
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
      break;

    case 'explode':
      // Noise buffer for explosion
      const bufferSize = audioCtx.sampleRate * 0.5;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      // Lowpass filter
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.linearRampToValueAtTime(100, t + 0.3);
      
      noise.connect(filter);
      filter.connect(gain);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      noise.start(t);
      noise.stop(t + 0.4);
      break;

    case 'build':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.15);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
      break;

    case 'sell':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.linearRampToValueAtTime(220, t + 0.15);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
      break;

    case 'error':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.linearRampToValueAtTime(55, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
      break;

    case 'success':
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, t + 0.3); // C6
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
      break;
      
    case 'ui':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;

    case 'start':
        // Power up sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 1);
        osc.start(t);
        osc.stop(t + 1);
        break;

    case 'win':
        // Victory Fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const o = audioCtx!.createOscillator();
            const g = audioCtx!.createGain();
            o.connect(g);
            g.connect(masterGain!);
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.05, t + i*0.15);
            g.gain.linearRampToValueAtTime(0, t + i*0.15 + 0.3);
            o.start(t + i*0.15);
            o.stop(t + i*0.15 + 0.3);
        });
        break;
    
    case 'lose':
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(110, t);
         osc.frequency.linearRampToValueAtTime(27.5, t + 1);
         gain.gain.setValueAtTime(0.2, t);
         gain.gain.linearRampToValueAtTime(0, t + 1);
         // Add wobbling LFO
         const lfo = audioCtx.createOscillator();
         lfo.frequency.value = 10;
         const lfoGain = audioCtx.createGain();
         lfoGain.gain.value = 20;
         lfo.connect(lfoGain);
         lfoGain.connect(osc.frequency);
         lfo.start(t);
         lfo.stop(t+1);

         osc.start(t);
         osc.stop(t + 1);
         break;
  }
};

// Music Sequencer
const BASS_LINE = [
    1, 0, 0, 1, 
    1, 0, 1, 0, 
    1, 0, 0, 1, 
    4, 0, 4, 0
]; // Scale degrees

const DRUM_LINE = [
    1, 0, 2, 0, // Kick, -, Snare, -
    1, 0, 2, 1,
    1, 0, 2, 0,
    1, 1, 2, 0
];

const LEAD_LINE = [
    0, 0, 0, 0,
    3, 0, 0, 0,
    5, 0, 5, 4,
    0, 0, 0, 0
];

export const playBGM = () => {
    if (!audioCtx || isMuted) return;
    initAudio();
    stopBGM(); // Ensure no duplicates

    let nextNoteTime = audioCtx.currentTime;
    currentNoteIndex = 0;

    // We use setInterval to schedule notes ahead of time (lookahead)
    sequencerInterval = window.setInterval(() => {
        if (!audioCtx) return;
        
        // Schedule notes for the next 200ms
        while (nextNoteTime < audioCtx.currentTime + 0.2) {
            scheduleNote(currentNoteIndex, nextNoteTime);
            nextNoteTime += NOTE_LENGTH;
            currentNoteIndex = (currentNoteIndex + 1) % 16;
        }
    }, 50);
};

const scheduleNote = (step: number, time: number) => {
    if (!audioCtx || !masterGain) return;

    // 1. Bass
    const bassNote = BASS_LINE[step];
    if (bassNote > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.type = 'sawtooth';
        // Freq calculation: Base * 2^(semitones/12)
        const freq = BASE_FREQ * Math.pow(2, SCALES.minor[bassNote-1] / 12);
        osc.frequency.setValueAtTime(freq, time);
        
        // Filter envelope for "pluck" sound
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.2);
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        
        osc.start(time);
        osc.stop(time + 0.2);
    }

    // 2. Drums
    const drumType = DRUM_LINE[step];
    if (drumType === 1) { // Kick
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        
        osc.start(time);
        osc.stop(time + 0.5);
    } else if (drumType === 2) { // Snare (Noise)
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        noise.connect(gain);
        gain.connect(masterGain);
        
        // Bandpass for "snare" tone
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        noise.disconnect();
        noise.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.start(time);
        noise.stop(time + 0.1);
    }

    // 3. Lead (Arp) - Sparse
    const leadNote = LEAD_LINE[step];
    if (leadNote > 0 && Math.random() > 0.3) { // slight variation
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.type = 'square';
        const freq = (BASE_FREQ * 4) * Math.pow(2, SCALES.minor[leadNote-1] / 12);
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        
        // Slight detune for chorus effect
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq * 1.01, time);
        osc2.connect(gain);
        osc2.start(time);
        osc2.stop(time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }
};

export const stopBGM = () => {
    if (sequencerInterval) {
        clearInterval(sequencerInterval);
        sequencerInterval = null;
    }
};
