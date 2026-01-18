import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const WHISPER_MODEL = "whisper-1";
export const CLEANUP_MODEL = "gpt-4o-mini";
