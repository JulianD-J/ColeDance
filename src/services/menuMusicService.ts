// Background menu music player for ColeDance

class MenuMusicService {
  private audio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('coledance_menu_music_muted') === 'true';
  }

  private init() {
    if (!this.audio) {
      // Local Just Dance electronic menu groove
      this.audio = new Audio('/audio/80s_vibe.mp3');
      this.audio.loop = true;
      this.audio.volume = this.isMuted ? 0 : 0.40;
    }
  }

  startMenuMusic() {
    this.init();
    if (!this.audio) return;
    if (this.isMuted) return;

    this.audio.volume = 0.45;
    this.audio.play().then(() => {
      this.isPlaying = true;
    }).catch(() => {
      // Autoplay might need user interaction first
      const onUserInteract = () => {
        if (!this.isMuted && this.audio) {
          this.audio.play().then(() => { this.isPlaying = true; }).catch(() => {});
        }
        window.removeEventListener('click', onUserInteract);
      };
      window.addEventListener('click', onUserInteract, { once: true });
    });
  }

  stopMenuMusic() {
    if (this.audio) {
      // Fade out
      let vol = this.audio.volume;
      const fadeInterval = setInterval(() => {
        vol = Math.max(0, vol - 0.1);
        if (this.audio) this.audio.volume = vol;
        if (vol <= 0.05) {
          clearInterval(fadeInterval);
          if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
          }
        }
      }, 50);
    }
  }

  toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('coledance_menu_music_muted', String(this.isMuted));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : 0.45;
      if (!this.isMuted && !this.isPlaying) {
        this.audio.play().catch(() => {});
        this.isPlaying = true;
      }
    }
    return this.isMuted;
  }

  setVolume(vol: number) {
    this.init();
    if (this.audio && !this.isMuted) {
      this.audio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }
}

export const menuMusic = new MenuMusicService();
