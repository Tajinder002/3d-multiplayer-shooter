import * as THREE from 'three';

export class AudioManager {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.sounds = new Map();
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    // Auto-play on user interaction to unlock audio context
    const unlockAudio = async () => {
      await this.audioContext.resume();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  loadSound(url, name) {
    if (this.sounds.has(name)) return;
    
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    
    request.onload = () => {
      this.audioContext.decodeAudioData(request.response, (buffer) => {
        this.sounds.set(name, buffer);
      }, (error) => {
        console.error('Error decoding audio:', error);
      });
    };
    
    request.onerror = () => {
      console.error('Error loading audio:', url);
    };
    
    request.send();
  }

  playSound(name, loop = false) {
    if (!this.sounds.has(name)) {
      console.warn(`Sound "${name}" not loaded.`);
      return;
    }
    
    const buffer = this.sounds.get(name);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.5;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }

  playShootSound() {
    this.playSound('shoot');
  }

  playReloadSound() {
    this.playSound('reload');
  }

  playKillSound() {
    this.playSound('kill');
  }
}