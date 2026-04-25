// agent-sdk/src/tools/generateVoiceover.ts

import axios from 'axios';
import { config } from '../config.js';

export async function generateVoiceover(params: {
  text: string;
  outputPath: string;
}): Promise<string> {
  const { text, outputPath } = params;

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    },
    {
      headers: {
        'xi-api-key': config.elevenLabsKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
    }
  );

  const { writeFile } = await import('fs/promises');
  await writeFile(outputPath, Buffer.from(response.data));
  return outputPath;
}
