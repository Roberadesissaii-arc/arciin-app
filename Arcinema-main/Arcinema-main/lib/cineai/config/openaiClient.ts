// lib/cineai/openaiClient.ts
// OpenAI client configuration for MovieVerse Assistant

import OpenAI from 'openai';

// Initialize OpenAI API with streaming support
export const openaiClient = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  timeout: 360000,
  dangerouslyAllowBrowser: true
});
