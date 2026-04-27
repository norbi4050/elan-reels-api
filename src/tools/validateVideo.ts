// agent-sdk/src/tools/validateVideo.ts

import ffmpeg from 'fluent-ffmpeg';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  duration_s?: number;
}

export async function validateVideo(params: {
  videoUrl: string;
  expectedDurationS: number;
}): Promise<ValidationResult> {
  const { videoUrl, expectedDurationS } = params;

  return new Promise((resolve) => {
    ffmpeg(videoUrl).ffprobe((err, data) => {
      if (err) {
        resolve({ valid: false, errors: [`ffprobe error: ${err.message}`] });
        return;
      }

      const errors: string[] = [];
      const videoStream = data.streams.find(s => s.codec_type === 'video');

      if (!videoStream) {
        errors.push('No video stream found');
      } else {
        const { width, height } = videoStream;
        if (width !== 1080 || height !== 1920) {
          errors.push(`Wrong resolution: ${width}x${height}, expected 1080x1920`);
        }
      }

      const duration = parseFloat(String(data.format.duration ?? '0'));
      if (Math.abs(duration - expectedDurationS) > 0.5) {
        errors.push(`Duration ${duration.toFixed(1)}s differs from expected ${expectedDurationS}s by > 0.5s`);
      }

      resolve({ valid: errors.length === 0, errors, duration_s: duration });
    });
  });
}
