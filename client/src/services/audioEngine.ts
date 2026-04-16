import { Howl, Howler } from 'howler';
import { getStreamInfo, getStreamUrl } from './api';

type AudioCallback = () => void;
type ProgressCallback = (position: number, duration: number) => void;

// ── YouTube IFrame Player API loader ──
let ytApiReady = false;
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiReady) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

class AudioEngine {
  private howl: Howl | null = null;
  private ytPlayer: any = null;
  private ytContainer: HTMLDivElement | null = null;
  private usingYT = false;
  private currentVideoId: string | null = null;
  private animFrameId: number | null = null;
  private ytProgressInterval: ReturnType<typeof setInterval> | null = null;
  private loadGeneration = 0;

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
    if (this.currentVideoId === videoId && (this.howl || this.ytPlayer)) return;

    this.destroy();
    this.currentVideoId = videoId;
    const generation = ++this.loadGeneration;

    // First, try getting a direct audio URL from the server (via Invidious/yt-dlp).
    let directUrl: string | null = null;
    try {
      const info = await getStreamInfo(videoId);
      directUrl = info.bestAudioUrl;
    } catch {
      // Server extraction failed — will try proxy or YT player fallback
    }

    const proxyUrl = getStreamUrl(videoId);
    const primaryUrl = directUrl || proxyUrl;

    return new Promise((resolve, reject) => {
      const tryYouTubeFallback = async () => {
        if (this.loadGeneration !== generation) return; // stale load, don't interfere
        console.log('Falling back to YouTube IFrame Player');
        this.destroyHowl();
        try {
          await this.loadYTPlayer(videoId);
          resolve();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'YouTube player failed';
          this.onErrorCb?.(msg);
          reject(new Error(msg));
        }
      };

      this.howl = new Howl({
        src: [primaryUrl],
        html5: true,
        format: ['webm', 'mp4', 'ogg', 'mp3', 'm4a'],
        preload: true,
        onload: () => {
          this.usingYT = false;
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
        onloaderror: (_id, _err) => {
          if (this.loadGeneration !== generation) return; // stale load
          // If direct URL failed, retry with proxy
          if (primaryUrl !== proxyUrl && this.currentVideoId === videoId) {
            console.warn('Direct audio failed, falling back to proxy');
            this.destroyHowl();
            this.currentVideoId = videoId;
            this.howl = new Howl({
              src: [proxyUrl],
              html5: true,
              format: ['webm', 'mp4', 'ogg', 'mp3', 'm4a'],
              preload: true,
              onload: () => { this.usingYT = false; this.onLoadCb?.(); resolve(); },
              onplay: () => { this.onPlayCb?.(); this.startProgressLoop(); },
              onpause: () => { this.onPauseCb?.(); this.stopProgressLoop(); },
              onstop: () => { this.onPauseCb?.(); this.stopProgressLoop(); },
              onend: () => { this.onEndCb?.(); this.stopProgressLoop(); },
              onloaderror: () => { if (this.loadGeneration === generation) tryYouTubeFallback(); },
              onplayerror: (_id2, err2) => {
                const msg = typeof err2 === 'string' ? err2 : 'Playback error';
                this.onErrorCb?.(msg);
              },
            });
            return;
          }
          // Both direct and proxy failed, try YouTube IFrame Player
          tryYouTubeFallback();
        },
        onplayerror: (_id, err) => {
          const msg = typeof err === 'string' ? err : 'Playback error';
          this.onErrorCb?.(msg);
        },
      });
    });
  }

  /** Call during a user gesture (tap/click) to unlock audio on mobile browsers.
   *  Just resuming AudioContext isn't enough on iOS/Android — we must play
   *  a real (silent) audio buffer during the gesture to unlock HTML5 Audio. */
  unlockAudio(): void {
    try {
      // 1. Resume the Web Audio context
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
      }
      // 2. Play a tiny silent Howl to unlock HTML5 Audio on mobile.
      //    This runs during the user tap, satisfying the autoplay policy.
      const silentHowl = new Howl({
        src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='],
        volume: 0,
        html5: true,
        autoplay: true,
        onend: () => { silentHowl.unload(); },
        onloaderror: () => { silentHowl.unload(); },
        onplayerror: () => { silentHowl.unload(); },
      });
    } catch {}
  }

  isReady(): boolean {
    return !!(this.howl || (this.usingYT && this.ytPlayer));
  }

  play(): void {
    if (this.usingYT && this.ytPlayer) {
      this.ytPlayer.playVideo();
    } else if (this.howl) {
      this.howl.play();
    }
  }

  pause(): void {
    if (this.usingYT && this.ytPlayer) {
      this.ytPlayer.pauseVideo();
    } else if (this.howl) {
      this.howl.pause();
    }
  }

  stop(): void {
    if (this.usingYT && this.ytPlayer) {
      this.ytPlayer.stopVideo();
    } else if (this.howl) {
      this.howl.stop();
    }
  }

  seek(position: number): void {
    if (this.usingYT && this.ytPlayer) {
      this.ytPlayer.seekTo(position, true);
    } else if (this.howl) {
      this.howl.seek(position);
    }
  }

  setVolume(vol: number): void {
    const v = Math.max(0, Math.min(1, vol));
    if (this.usingYT && this.ytPlayer) {
      this.ytPlayer.setVolume(v * 100);
    }
    if (this.howl) {
      this.howl.volume(v);
    }
    Howler.volume(v);
  }

  getPosition(): number {
    if (this.usingYT && this.ytPlayer) {
      return this.ytPlayer.getCurrentTime?.() || 0;
    }
    if (!this.howl) return 0;
    const pos = this.howl.seek();
    return typeof pos === 'number' ? pos : 0;
  }

  getDuration(): number {
    if (this.usingYT && this.ytPlayer) {
      return this.ytPlayer.getDuration?.() || 0;
    }
    if (!this.howl) return 0;
    return this.howl.duration() || 0;
  }

  isPlaying(): boolean {
    if (this.usingYT && this.ytPlayer) {
      return this.ytPlayer.getPlayerState?.() === 1; // YT.PlayerState.PLAYING
    }
    return this.howl?.playing() || false;
  }

  destroy(): void {
    this.stopProgressLoop();
    this.destroyHowl();
    this.destroyYTPlayer();
    this.currentVideoId = null;
  }

  private destroyHowl(): void {
    if (this.howl) {
      this.howl.unload();
      this.howl = null;
    }
  }

  private destroyYTPlayer(): void {
    if (this.ytProgressInterval) {
      clearInterval(this.ytProgressInterval);
      this.ytProgressInterval = null;
    }
    if (this.ytPlayer) {
      try { this.ytPlayer.destroy(); } catch {}
      this.ytPlayer = null;
    }
    if (this.ytContainer) {
      this.ytContainer.remove();
      this.ytContainer = null;
    }
    this.usingYT = false;
  }

  private async loadYTPlayer(videoId: string): Promise<void> {
    await loadYouTubeApi();

    // Create hidden container for the YT player
    this.ytContainer = document.createElement('div');
    this.ytContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    const playerDiv = document.createElement('div');
    playerDiv.id = `yt-player-${Date.now()}`;
    this.ytContainer.appendChild(playerDiv);
    document.body.appendChild(this.ytContainer);

    return new Promise<void>((resolve, reject) => {
      const YT = (window as any).YT;
      this.ytPlayer = new YT.Player(playerDiv.id, {
        width: 1,
        height: 1,
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            this.usingYT = true;
            this.onLoadCb?.();
            resolve();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
              this.onPlayCb?.();
              this.startYTProgressLoop();
            } else if (state === YT.PlayerState.PAUSED) {
              this.onPauseCb?.();
              this.stopYTProgressLoop();
            } else if (state === YT.PlayerState.ENDED) {
              this.onEndCb?.();
              this.stopYTProgressLoop();
            }
          },
          onError: (event: any) => {
            const msg = `YouTube player error: ${event.data}`;
            this.onErrorCb?.(msg);
            reject(new Error(msg));
          },
        },
      });
    });
  }

  private startYTProgressLoop(): void {
    this.stopYTProgressLoop();
    this.ytProgressInterval = setInterval(() => {
      if (this.usingYT && this.ytPlayer) {
        const pos = this.ytPlayer.getCurrentTime?.() || 0;
        const dur = this.ytPlayer.getDuration?.() || 0;
        this.onProgressCb?.(pos, dur);
      }
    }, 250);
  }

  private stopYTProgressLoop(): void {
    if (this.ytProgressInterval) {
      clearInterval(this.ytProgressInterval);
      this.ytProgressInterval = null;
    }
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
