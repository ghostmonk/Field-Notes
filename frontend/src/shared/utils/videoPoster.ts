/**
 * Extract a poster frame and real dimensions from a video file.
 * Uses a hidden <video> + <canvas> to capture a frame at 1 second.
 */

interface VideoPosterResult {
  posterBlob: Blob;
  width: number;
  height: number;
}

const CAPTURE_TIME_SECONDS = 1;
const POSTER_QUALITY = 0.85;
const EXTRACTION_TIMEOUT_MS = 15_000;

export function extractVideoPoster(
  file: File
): Promise<VideoPosterResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    const timeout = setTimeout(
      () => fail('Poster extraction timed out'),
      EXTRACTION_TIMEOUT_MS
    );

    video.addEventListener('error', () => {
      clearTimeout(timeout);
      fail('Failed to load video for poster extraction');
    });

    video.addEventListener('loadedmetadata', () => {
      const seekTime = Math.min(CAPTURE_TIME_SECONDS, video.duration * 0.1);
      video.currentTime = seekTime;
    });

    video.addEventListener('seeked', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Capture dimensions before cleanup detaches the video element
      const width = canvas.width;
      const height = canvas.height;

      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            reject(new Error('Failed to create poster blob'));
            return;
          }
          resolve({ posterBlob: blob, width, height });
        },
        'image/jpeg',
        POSTER_QUALITY
      );
    }, { once: true });

    video.src = url;
  });
}
