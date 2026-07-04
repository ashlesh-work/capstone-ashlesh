/**
 * Centralized configuration, read once from the environment.
 * Keys are read here and NEVER sent to the client.
 */

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function opt(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(opt('PORT', '8787')),
  corsOrigins: opt('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  providers: {
    stt: opt('STT_PROVIDER', 'openai'),
    llm: opt('LLM_PROVIDER', 'openai'),
    tts: opt('TTS_PROVIDER', 'elevenlabs')
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    llmModel: opt('OPENAI_LLM_MODEL', 'gpt-4o-mini'),
    sttModel: opt('OPENAI_STT_MODEL', 'whisper-1'),
    embedModel: opt('OPENAI_EMBED_MODEL', 'text-embedding-3-small')
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? '',
    voiceId: opt('ELEVENLABS_VOICE_ID', ''),
    voiceIdEs: opt('ELEVENLABS_VOICE_ID_ES', ''),
    ttsModel: opt('ELEVENLABS_TTS_MODEL', 'eleven_turbo_v2_5')
  },

  retriever: opt('RETRIEVER', 'lexical') as 'lexical' | 'embedding',
  retrievalThreshold: Number(opt('RETRIEVAL_THRESHOLD', '0.12')),

  // --- Capstone: tracing, memory, tools, evaluation ---
  /** Directory for JSONL trace + eval-run persistence (git-ignored). */
  dataDir: opt('DATA_DIR', 'data'),
  /** Idle minutes before a session's memory is reset (retention rule). */
  sessionTtlMin: Number(opt('SESSION_TTL_MIN', '60')),
  /** Conversation exchanges kept as short-term memory. */
  memoryTurns: Number(opt('MEMORY_TURNS', '4')),
  /** Loop-prevention cap on tool routing retries per turn. */
  toolMaxIterations: Number(opt('TOOL_MAX_ITERATIONS', '2')),
  /** Model used by the LLM-as-a-judge evaluator. */
  judgeModel: opt('JUDGE_MODEL', 'gpt-4o-mini'),
  /** Default prompt variant for the production pipeline (v1|v2|v3). */
  promptVariant: opt('PROMPT_VARIANT', 'v2'),
  /** Optional shared secret protecting /api/eval/* and /api/traces*. Empty = open (local demo). */
  evalToken: opt('EVAL_TOKEN', '')
} as const;

/** Throw early if a configured provider is missing its key. */
export function assertProviderKeys(): void {
  if (config.providers.llm === 'openai' || config.providers.stt === 'openai' || config.retriever === 'embedding') {
    if (!config.openai.apiKey) throw new Error('OPENAI_API_KEY is required for the selected providers');
  }
  if (config.providers.tts === 'elevenlabs' && !config.elevenlabs.apiKey) {
    throw new Error('ELEVENLABS_API_KEY is required for the selected TTS provider');
  }
}
