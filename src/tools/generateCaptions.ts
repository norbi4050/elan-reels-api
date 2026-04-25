// agent-sdk/src/tools/generateCaptions.ts

import axios from 'axios';
import { readFileSync } from 'fs';
import { config } from '../config.js';

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export async function generateCaptions(params: {
  audioPath: string;
}): Promise<{ srtContent: string; words: WordTimestamp[] }> {
  const { audioPath } = params;

  const audioBuffer = readFileSync(audioPath);
  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'voiceover.mp3');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'es');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: { Authorization: `Bearer ${config.openaiKey}` },
  });

  const words: WordTimestamp[] = response.data.words ?? [];
  const srtContent = wordsToSrt(words);

  return { srtContent, words };
}

function wordsToSrt(words: WordTimestamp[]): string {
  const chunks: WordTimestamp[][] = [];
  let current: WordTimestamp[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= 5) { chunks.push(current); current = []; }
  }
  if (current.length) chunks.push(current);

  return chunks.map((chunk, i) => {
    const start = formatSrtTime(chunk[0].start);
    const end = formatSrtTime(chunk[chunk.length - 1].end);
    const text = chunk.map(w => w.word).join(' ');
    return `${i + 1}\n${start} --> ${end}\n${text}`;
  }).join('\n\n');
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}
