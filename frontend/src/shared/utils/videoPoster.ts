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
const EXTRACTION_TIMEOUT_MS = 5_000;

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
    // iOS Safari requires video in DOM to decode frames
    video.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0';
    document.body.appendChild(video);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error(msg));
    };

    const timeout = setTimeout(
      () => fail('Poster extraction timed out'),
      EXTRACTION_TIMEOUT_MS
    );

    video.addEventListener('error', () => {
      fail('Failed to load video for poster extraction');
    }, { once: true });

    const captureFrame = () => {
      if (settled) return;
      settled = true;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      if (!canvas.width || !canvas.height) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error('Video has zero dimensions'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      canvas.toBlob(
        (blob) => {
          clearTimeout(timeout);
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
    };

    video.addEventListener('loadedmetadata', () => {
      const seekTime = isFinite(video.duration)
        ? Math.min(CAPTURE_TIME_SECONDS, video.duration * 0.1)
        : CAPTURE_TIME_SECONDS;
      if (seekTime === video.currentTime) {
        captureFrame();
      } else {
        // Register seeked listener only when we actually need to seek
        video.addEventListener('seeked', captureFrame, { once: true });
        video.currentTime = seekTime;
      }
    }, { once: true });

    video.src = url;
  });
}
