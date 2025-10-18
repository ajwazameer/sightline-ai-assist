export class TextToSpeech {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private volume: number = 1;
  private isMuted: boolean = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices() {
    const voices = this.synth.getVoices();
    // Prefer English voices
    this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0] || null;

    // Load voices on Chrome (they load async)
    if (voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        const newVoices = this.synth.getVoices();
        this.voice = newVoices.find(v => v.lang.startsWith('en')) || newVoices[0] || null;
      });
    }
  }

  speak(text: string, priority: 'high' | 'normal' = 'normal') {
    if (this.isMuted) return;

    // Cancel previous utterances if high priority
    if (priority === 'high') {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.volume = this.volume;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    this.synth.speak(utterance);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume / 100));
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.synth.cancel();
    }
  }

  cancel() {
    this.synth.cancel();
  }
}
