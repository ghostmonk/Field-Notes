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

export function extractVideoPoster(
  file: File
): Promise<VideoPosterResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('Failed to load video for poster extraction'));
    });

    video.addEventListener('loadedmetadata', () => {
      const seekTime = Math.min(CAPTURE_TIME_SECONDS, video.duration * 0.1);
      video.currentTime = seekTime;
    });

    video.addEventListener('seeked', () => {
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
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            reject(new Error('Failed to create poster blob'));
            return;
          }
          resolve({
            posterBlob: blob,
            width: video.videoWidth,
            height: video.videoHeight,
          });
        },
        'image/jpeg',
        POSTER_QUALITY
      );
    });

    video.src = url;
  });
}
