// lib/cineai/deepseekClient.ts
// DeepSeek AI client configuration for MovieVerse Assistant
// Using DeepSeek-V3.2-Exp via deepseek-chat model (non-thinking mode)
// According to DeepSeek API docs: deepseek-chat is the non-thinking mode of DeepSeek-V3.2-Exp
// This is the latest and most efficient model as of 2025

import OpenAI from 'openai';

// Initialize DeepSeek API with streaming support
export const deepseekClient = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
  timeout: 360000,
  dangerouslyAllowBrowser: true
});
