import { WeatherId, WorldDistrictId } from '../types/characterStudio';

/**
 * Zero-404 procedural Web Audio environmental ambience controller
 * (gentle urban breeze, rain pattering on asphalt, coastal surf).
 */
export class WorldAmbientAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private enabled = false;

  setEnabled(on: boolean, district: WorldDistrictId, weather: WeatherId): void {
    this.enabled = on;
    if (!on) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      }
      return;
    }

    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * 3;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Pink-ish noise for natural air/rain/surf texture
        let b0 = 0,
          b1 = 0,
          b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.997 * b0 + white * 0.029;
          b1 = 0.985 * b1 + white * 0.032;
          b2 = 0.95 * b2 + white * 0.048;
          data[i] = (b0 + b1 + b2 + white * 0.08) * 0.45;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 550;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.0;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);

        this.sourceNode = source;
        this.filterNode = filter;
        this.masterGain = gain;
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.updateProfile(district, weather);
    } catch {
      // AudioContext blocked or unavailable
    }
  }

  updateProfile(district: WorldDistrictId, weather: WeatherId): void {
    if (!this.enabled || !this.ctx || !this.filterNode || !this.masterGain) return;
    let freq = 420;
    let level = 0.045;
    if (weather === 'rain') {
      freq = 1450;
      level = 0.085;
    } else if (district === 'busan_beach') {
      freq = 640;
      level = 0.07;
    } else if (district === 'photo_studio') {
      freq = 280;
      level = 0.015;
    }
    this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.25);
    this.masterGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.25);
  }

  dispose(): void {
    try {
      this.sourceNode?.stop();
      this.sourceNode?.disconnect();
      this.filterNode?.disconnect();
      this.masterGain?.disconnect();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // ignore cleanup error
    }
    this.ctx = null;
    this.sourceNode = null;
    this.filterNode = null;
    this.masterGain = null;
  }
}
