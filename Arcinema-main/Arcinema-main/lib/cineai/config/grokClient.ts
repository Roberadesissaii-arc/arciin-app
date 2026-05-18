// lib/cineai/grokClient.ts
// xAI Grok client configuration for MovieVerse Assistant

import OpenAI from 'openai';

// Initialize xAI Grok with streaming support
export const grokClient = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
  timeout: 360000,
  dangerouslyAllowBrowser: true
});
