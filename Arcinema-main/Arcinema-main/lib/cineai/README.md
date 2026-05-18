# CineAI Architecture

Clean, production-ready structure for the CineAI movie assistant.

## Directory Structure

```
lib/cineai/
├── api/                          # API integrations
│   ├── imdbRapidApi.ts          # IMDb RapidAPI integration
│   ├── omdbApi.ts               # OMDB API fallback search
│   ├── tmdbApi.ts               # Primary TMDB API (50+ functions)
│   ├── tmdbLists.ts             # TMDB list management
│   └── whereToWatchApi.ts       # Streaming availability data
│
├── config/                       # AI model clients
│   ├── deepseekClient.ts        # DeepSeek AI client
│   ├── grokClient.ts            # Grok AI client
│   └── ollamaCloudClient.ts     # Ollama Cloud client (7 models)
│
├── tools/                        # Function definitions
│   └── function-definitions.ts  # All 50+ AI function tools
│
├── utils/                        # Helper utilities
│   ├── cineai-utils.ts          # Core utility functions
│   ├── message-utils.ts         # Message formatting & processing
│   └── title-matcher.ts         # Smart title matching & variations
│
├── systemPrompt.simple.ts       # Simplified AI system prompt (~210 lines)
└── index.ts                     # Central exports
```

**Total: 14 files** - All actively used, no dead code.

## Key Features

### Clean Architecture
- **No unused files**: Every file is actively imported and used
- **No backup files**: Clean production structure
- **Organized folders**: Clear separation of concerns
- **Minimal dependencies**: Only essential code

### Fixed Issues
1. ✅ **All AI models work identically**: Temperature set to 0.1 for consistent function calling
2. ✅ **Greeting detection**: "hello"/"hi" → friendly greeting (no movie search)
3. ✅ **Trending detection**: "what's trending?" → calls get_trending_movies()
4. ✅ **Clean query extraction**: Prevents full questions being used as search terms
5. ✅ **Response formatting**: Proper spacing, no markdown artifacts
6. ✅ **Ollama Cloud models**: Now call functions correctly like DeepSeek

### Removed Features
- ❌ Netflix API (unnecessary complexity)
- ❌ Rotten Tomatoes API (not being used)
- ❌ Streaming Availability API (not being used)
- ❌ Modular prompts folder (over-engineered, unused)
- ❌ Query helper utils (redundant)
- ❌ All backup files

## AI Models Supported

**13 Total Models:**
1. DeepSeek (default)
2. Grok
3. GPT-3.5 Turbo
4. GPT-4
5. Claude
6. Gemini
7-13. Ollama Cloud variants (7 models):
   - ollama-deepseek-v3
   - ollama-gpt-oss-20b
   - ollama-gpt-oss-120b
   - ollama-kimi-k2
   - ollama-qwen3
   - ollama-glm
   - ollama-minimax

## Data Sources

- **Primary**: TMDB (The Movie Database) - 50+ functions
- **Fallback**: OMDB (Open Movie Database)
- **Additional**: IMDb RapidAPI, Where to Watch

## Usage

### Import from centralized index
```typescript
import { 
  CINEAI_SYSTEM_PROMPT,
  buildSystemPromptWithContext,
  functionTools,
  generateUniqueId,
  formatMessageWithGradientTitles
} from '@/lib/cineai';
```

### Or import directly from modules
```typescript
import { deepseekClient } from '@/lib/cineai/config/deepseekClient';
import { searchMoviesByQuery } from '@/lib/cineai/api/tmdbApi';
import { getMediaTitle } from '@/lib/cineai/utils/cineai-utils';
```

## Maintenance

### Adding New Functions
1. Add function definition to `tools/function-definitions.ts`
2. Implement handler in `CineAIContainer.tsx`
3. Update system prompt if needed in `systemPrompt.simple.ts`

### Adding New AI Models
1. Create new client in `config/` (if using custom endpoint)
2. Add model selection logic in `CineAIContainer.tsx`
3. Set temperature to 0.1 for consistency

### Adding New APIs
1. Create new API file in `api/` folder
2. Export functions from `index.ts` if needed
3. Add corresponding function definitions to `tools/function-definitions.ts`

## Production Ready

- ✅ No compile errors
- ✅ All imports use new folder structure
- ✅ Mobile and desktop containers updated
- ✅ No dead code or unused files
- ✅ Clean git history (no backup files)
- ✅ TypeScript strict mode compatible
- ✅ Optimized for code splitting (dynamic imports where appropriate)
