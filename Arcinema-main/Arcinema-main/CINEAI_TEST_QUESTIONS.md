# CineAI Test Questions - Knowledge & Responsiveness

## Test Suite for CineAI Functionality

Please test these questions and provide the AI's responses. This will help fine-tune the system.

---

## 1. CONVERSATIONAL QUERIES (Should respond naturally, NOT immediately search)

### 1.1 Basic Conversation
- "Do Shakespeare have movie?"
- "What kind of movie do you recommend?"
- "I'm planning to watch movie today"
- "I just wanna talk"
- "Let's have a conversation"

### 1.2 "Do You Know" Queries (Should respond conversationally FIRST, then search)
- "Do you know the new movies magen 2?"
- "Do you know Inception?"
- "Do you know Spider-Man movies?"
- "Do you know the movie called The Matrix?"
- "Do you know M3GAN?"

---

## 2. MOVIE NAME VARIATIONS (Should normalize correctly)

### 2.1 M3GAN Variations
- "magen 2"
- "megan 2"
- "m3gan 2"
- "Magen part 2"
- "Party two" (if user mentioned M3GAN before)
- "magen"
- "megan"

### 2.2 Other Common Variations
- "spider-man" (should search for "Spider-Man")
- "fast and furious" (should search for "Fast & Furious")

---

## 3. SEARCH QUERIES (Should call functions immediately)

### 3.1 Direct Search Requests
- "Find me Inception"
- "Show me The Matrix"
- "Search for Spider-Man movies"
- "Can you find M3GAN 2?"
- "Get me action movies"

### 3.2 Genre Queries
- "action movies"
- "horror films"
- "romance movies 2024"
- "sci-fi thriller"
- "comedy movies"

---

## 4. CONTEXT AWARENESS (Should use recent context)

### 4.1 Questions About Recently Shown Movies
- Show a movie first, then ask: "What is this movie about?"
- Show a movie first, then ask: "Who are the characters?"
- Show a movie first, then ask: "How old is the main character?"
- Show a movie first, then ask: "Tell me more about this movie"

### 4.2 Follow-up Questions
- After showing Spider-Man movies, ask: "Is it only this one?"
- After showing results, ask: "Why are you keep giving me the same thing?"

---

## 5. NATURAL LANGUAGE RESPONSES (Should be styled and natural)

### 5.1 Movie Lists
- "List all Spider-Man movies"
- "Show me adventure movies"
- "Find me the latest Spider-man movie"

**Expected:** 
- Natural opening line (not "I found X results")
- Bullet points (•) for organization
- Engaging descriptions (1-2 sentences each)
- Natural closing question

### 5.2 Cast Information
- "List all the characters Spider-man movie"
- "Who is the cast of Inception?"
- "Who stars in The Matrix?"

**Expected:**
- Natural language response with character names
- Actor images displayed
- Streaming response (not instant)

---

## 6. EDGE CASES & ERROR HANDLING

### 6.1 Unknown Movies
- "Do you know the movie called XYZ123?"
- "Find me the movie ABCDEFG"
- "Show me a movie that doesn't exist"

**Expected:**
- Natural response: "I couldn't find [movie name] in the database..."
- Suggestion to check spelling or try different search

### 6.2 Vague Queries
- "movies"
- "what's trending?"
- "popular movies"
- "best movies 2024"

**Expected:**
- Appropriate function calls
- Natural responses with context

### 6.3 Mixed Queries
- "Do you know action movies?" (conversational + genre)
- "I'm planning to watch Spider-Man today" (conversational + specific movie)

---

## 7. FUNCTION CALLING BEHAVIOR

### 7.1 Should NOT Call Functions
- Greetings: "hi", "hey", "hello"
- Pure conversation: "I just wanna talk"
- "Do [X] have movie?" (conversational)

### 7.2 Should Call Functions
- "Find me [movie]"
- "Show me [movie]"
- "[Genre] movies"
- "Do you know [movie]?" (after responding conversationally)

---

## 8. RESPONSE QUALITY CHECKS

### 8.1 Response Style
- ✅ Natural, conversational tone
- ✅ Bullet points (•) for lists
- ✅ Engaging descriptions
- ✅ No hardcoded/templated feel
- ✅ Streaming effect (not instant)

### 8.2 Response Content
- ✅ Answers the question directly
- ✅ Provides relevant information
- ✅ Uses context when available
- ✅ Handles errors gracefully

---

## 9. SPECIFIC SCENARIOS FROM USER FEEDBACK

### 9.1 User's Original Issues
- "Do you know the new movies magen 2" → Should normalize to "M3GAN 2" and respond conversationally
- "Do Shakespeare have movie?" → Should respond conversationally, not immediately search
- "What kind of movie do you recommend?" → Should have conversation about preferences
- "I'm planning to watch movie today" → Should ask about mood/preferences

### 9.2 Response Disappearing Issue
- Ask a question that triggers function calls
- Check if AI's initial response stays visible
- Check if function results are displayed alongside AI response (not replacing it)

---

## 10. MODE AWARENESS (If applicable)

### 10.1 Web Search Mode
- Ask about current events without Web Search mode → Should guide to enable mode
- Ask about current events with Web Search mode → Should search web

### 10.2 Cast & Crew Mode
- Ask about actor without mode → Should guide to enable mode
- Ask about actor with mode → Should search for person

### 10.3 Similar Movies Mode
- Ask "movies like X" without mode → Should guide to enable mode
- Ask "movies like X" with mode → Should use advanced similar movies logic

---

## TESTING INSTRUCTIONS

1. Test each question in order
2. Copy the EXACT AI response (including any function calls shown)
3. Note any issues:
   - Did it respond conversationally when it should?
   - Did it call functions when it shouldn't?
   - Did it normalize movie names correctly?
   - Was the response natural and styled?
   - Did the response stream or appear instantly?
   - Did the AI's initial response disappear when functions were called?

4. Provide feedback for each category

---

## EXPECTED BEHAVIOR SUMMARY

✅ **CONVERSATIONAL QUERIES:**
- Respond naturally first
- Don't immediately call functions
- Have a conversation, then offer to search

✅ **"DO YOU KNOW" QUERIES:**
- Respond: "Yes! I know about [Movie]! Let me find it for you."
- Then call search function
- Never call function silently

✅ **MOVIE NAME NORMALIZATION:**
- "magen" → "M3GAN"
- "magen 2" → "M3GAN 2"
- Extract movie names from conversational queries

✅ **RESPONSE STYLE:**
- Natural, conversational tone
- Bullet points (•) for lists
- Engaging descriptions
- Streaming effect
- No hardcoded/templated feel

✅ **FUNCTION CALLING:**
- Only call functions when appropriate
- Respond conversationally before calling (for "do you know" queries)
- Never replace AI's initial response with function results


