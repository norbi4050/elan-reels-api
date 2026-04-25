// agent-sdk/src/tools/judgeImage.ts

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { VLMScore } from '../types/index.js';

const anthropic = new Anthropic({ apiKey: config.anthropicKey });

const JUDGE_SYSTEM = `You are a creative director evaluating AI-generated keyframes for elan.casa Instagram Reels. elan.casa sells Shelly and Fibaro+ smart home devices and Enertik solar panels to premium homeowners in Posadas, Argentina. Target aesthetic: Apple/Lutron/Bang&Olufsen.

Score 0-10:
- 10: Indistinguishable from Apple/Lutron professional marketing photography
- 8-9: Professional quality, publishable
- 7: Acceptable with minor issues — PASS threshold
- 5-6: Amateurish but recognizable
- 0-4: Reject (CGI look, wrong products, cheap interior, text in image, faces visible, wrong orientation)

Respond with JSON only, no markdown: {"score":N,"reasoning":"...","pass":true|false}`;

export async function judgeImage(params: {
  imageUrl: string;
  sceneBrief: string;
}): Promise<VLMScore> {
  const { imageUrl, sceneBrief } = params;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: JUDGE_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: `Scene brief: ${sceneBrief}\n\nScore this image.` },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`judgeImage: Claude returned non-JSON: ${text}`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    score: Number(parsed.score ?? 0),
    reasoning: String(parsed.reasoning ?? ''),
    pass: Boolean(parsed.pass ?? false),
  };
}
