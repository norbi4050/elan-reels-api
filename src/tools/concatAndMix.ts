// agent-sdk/src/tools/concatAndMix.ts

import ffmpeg from 'fluent-ffmpeg';
import { writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Scene } from '../types/index.js';

export async function concatAndMix(params: {
  clipPaths: string[];
  scenes: Scene[];
  voiceoverPath: string;
  srtPath: string;
  outputPath: string;
}): Promise<string> {
  const { clipPaths, scenes, voiceoverPath, srtPath, outputPath } = params;

  const crossfadeDuration = 0.3;
  const concatListPath = join(tmpdir(), `concat-${Date.now()}.txt`);
  const concatList = clipPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(concatListPath, concatList);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    clipPaths.forEach(p => cmd.input(p));
    cmd.input(voiceoverPath);

    const videoInputCount = clipPaths.length;

    let filterParts: string[] = [];
    let prevLabel = `[0:v]`;

    for (let i = 1; i < clipPaths.length; i++) {
      const transition = scenes[i - 1]?.transition_next;
      const nextLabel = `[v${i}]`;
      if (transition === 'crossfade_300ms') {
        const offset = scenes.slice(0, i).reduce((acc, s) => acc + s.duracion_s, 0) - crossfadeDuration;
        filterParts.push(`${prevLabel}[${i}:v]xfade=fade:duration=${crossfadeDuration}:offset=${offset}${nextLabel}`);
      } else {
        filterParts.push(`${prevLabel}[${i}:v]concat=n=2:v=1:a=0${nextLabel}`);
      }
      prevLabel = nextLabel;
    }

    const finalVideoLabel = clipPaths.length === 1 ? '[0:v]' : prevLabel;

    filterParts.push(`[${videoInputCount}:a]aformat=sample_rates=44100:channel_layouts=stereo[aout]`);

    cmd
      .complexFilter(filterParts.join('; '))
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        `-vf subtitles=${srtPath}:force_style='FontSize=22,Alignment=2,MarginV=40,PrimaryColour=&HFFFFFF&'`,
        '-movflags faststart',
        '-crf 18',
        '-preset fast',
      ])
      .output(outputPath)
      .on('end', async () => {
        await rm(concatListPath, { force: true });
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`ffmpeg concat error: ${err.message}`));
      })
      .run();
  });
}
