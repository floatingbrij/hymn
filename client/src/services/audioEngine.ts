import { Howl } from 'howler';
import { getStreamInfo, getStreamUrl } from './api';

type AudioCallback = () => void;
type ProgressCallback = (position: number, duration: number) => void;

class AudioEngine {
  private howl: Howl | null = null;
  private currentVideoId: string | null = null;
  private animFrameId: number | null = null;

  private onPlayCb: AudioCallback | null = null;
  private onPauseCb: AudioCallback | null = null;
  private onEndCb: AudioCallback | null = null;
  private onErrorCb: ((error: string) => void) | null = null;
  private onProgressCb: ProgressCallback | null = null;
  private onLoadCb: AudioCallback | null = null;

  onPlay(cb: AudioCallback) { this.onPlayCb = cb; }
  onPause(cb: AudioCallback) { this.onPauseCb = cb; }
  onEnd(cb: AudioCallback) { this.onEndCb = cb; }
  onError(cb: (error: string) => void) { this.onErrorCb = cb; }
  onProgress(cb: ProgressCallback) { this.onProgressCb = cb; }
  onLoad(cb: AudioCallback) { this.onLoadCb = cb; }

  async load(videoId: string): Promise<void> {
    // Don't reload the same track
    if (this.currentVideoId === videoId && this.howl) return;

    this.destroy();
    this.currentVideoId = videoId;

    // First, get the direct audio URL from the server (triggers yt-dlp extraction).
    // Then try playing directly from YouTube CDN (no CORS issue for <audio> elements).
    // Fall back to the proxy URL if direct playback fails.
    let directUrl: string | null = null;
    try {
      const info = await getStreamInfo(videoId);
      directUrl = info.bestAudioUrl;
    } catch {
      // Fall back to proxy
    }

    const proxyUrl = getStreamUrl(videoId);
    const primaryUrl = directUrl || proxyUrl;

    return new Promise((resolve, reject) => {
      this.howl = new Howl({
        src: [primaryUrl],
        html5: true, // Required for streaming
        format: ['webm', 'mp4', 'ogg', 'mp3', 'm4a'],
        preload: true,
        onload: () => {
          this.onLoadCb?.();
          resolve();
        },
        onplay: () => {
          this.onPlayCb?.();
          this.startProgressLoop();
        },
        onpause: () => {
          this.onPauseCb?.();
          this.stopProgressLoop();
        },
        onstop: () => {
          this.onPauseCb?.();
          this.stopProgressLoop();
        },
        onend: () => {
          this.onEndCb?.();
          this.stopProgressLoop();
        },
        onloaderror: (_id, err) => {
          // If direct URL failed, retry with proxy
          if (primaryUrl !== proxyUrl && this.currentVideoId === videoId) {
            console.warn('Direct audio failed, falling back to proxy');
            this.destroy();
            this.currentVideoId = videoId;
            this.howl = new Howl({
              src: [proxyUrl],
              html5: true,
              format: ['webm', 'mp4', 'ogg', 'mp3', 'm4a'],
              preload: true,
              onload: () => { this.onLoadCb?.(); resolve(); },
              onplay: () => { this.onPlayCb?.(); this.startProgressLoop(); },
              onpause: () => { this.onPauseCb?.(); this.stopProgressLoop(); },
              onstop: () => { this.onPauseCb?.(); this.stopProgressLoop(); },
              onend: () => { this.onEndCb?.(); this.stopProgressLoop(); },
              onloaderror: (_id2, err2) => {
                const msg = typeof err2 === 'string' ? err2 : 'Failed to load audio';
                this.onErrorCb?.(msg);
                reject(new Error(msg));
              },
              onplayerror: (_id2, err2) => {
                const msg = typeof err2 === 'string' ? err2 : 'Playback error';
                this.onErrorCb?.(msg);
              },
            });
            return;
          }
          const msg = typeof err === 'string' ? err : 'Failed to load audio';
          this.onErrorCb?.(msg);
          reject(new Error(msg));
        },
        onplayerror: (_id, err) => {
          const msg = typeof err === 'string' ? err : 'Playback error';
          this.onErrorCb?.(msg);
        },
      });
    });
  }

  play(): void {
    if (this.howl) {
      this.howl.play();
    }
  }

  pause(): void {
    if (this.howl) {
      this.howl.pause();
    }
  }

  stop(): void {
    if (this.howl) {
      this.howl.stop();
    }
  }

  seek(position: number): void {
    if (this.howl) {
      this.howl.seek(position);
    }
  }

  setVolume(vol: number): void {
    if (this.howl) {
      this.howl.volume(Math.max(0, Math.min(1, vol)));
    }
    // Set global volume for future howls too
    Howler.volume(Math.max(0, Math.min(1, vol)));
  }

  getPosition(): number {
    if (!this.howl) return 0;
    const pos = this.howl.seek();
    return typeof pos === 'number' ? pos : 0;
  }

  getDuration(): number {
    if (!this.howl) return 0;
    return this.howl.duration() || 0;
  }

  isPlaying(): boolean {
    return this.howl?.playing() || false;
  }

  destroy(): void {
    this.stopProgressLoop();
    if (this.howl) {
      this.howl.unload();
      this.howl = null;
    }
    this.currentVideoId = null;
  }

  private startProgressLoop(): void {
    this.stopProgressLoop();
    const tick = () => {
      if (this.howl?.playing()) {
        const pos = this.getPosition();
        const dur = this.getDuration();
        this.onProgressCb?.(pos, dur);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopProgressLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

// Singleton
export const audioEngine = new AudioEngine();
