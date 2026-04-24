// agent-sdk/src/config.ts

export const config = {
  openaiKey: process.env.OPENAI_API_KEY!,
  anthropicKey: process.env.ANTHROPIC_API_KEY!,
  falKey: process.env.FAL_KEY!,
  elevenLabsKey: process.env.ELEVENLABS_API_KEY!,
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? '9oPKasc15pfAbMr7N6Gs',
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
  useHappyHorse: process.env.USE_HAPPYHORSE === 'true',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL!,
  port: Number(process.env.PORT ?? 3000),
  agentBaseUrl: process.env.AGENT_BASE_URL!,
};

export function validateConfig(): void {
  const required = [
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'FAL_KEY',
    'ELEVENLABS_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY',
    'WEBHOOK_BASE_URL', 'AGENT_BASE_URL',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
