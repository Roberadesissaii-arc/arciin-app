import OpenAI from 'openai';

// Lazy initialization to prevent client-side errors
let deepseek: OpenAI | null = null;

function getDeepSeekClient(): OpenAI {
  if (!deepseek) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }

    deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });
  }
  
  return deepseek;
}

export async function generateMovieDescription(originalDescription: string, movieTitle?: string): Promise<string> {
  try {
    const client = getDeepSeekClient();
    
    const prompt = movieTitle 
      ? `You are a professional movie description writer. Based on the following movie information, create an engaging and detailed movie description that is longer and more compelling than the original. Keep it informative and exciting.

Movie: ${movieTitle}
Original Description: ${originalDescription}

Create a new, longer description (at least 50-100 words, aim for 1 paragraph) that:
- Hooks readers with an exciting opening
- Expands on the story and plot elements
- Highlights key themes and what makes this movie special
- Creates genuine excitement about watching it
- Maintains a professional, engaging movie marketing tone

Write a comprehensive, single-paragraph description that feels like professional movie marketing copy.`
      : `You are a professional movie description writer. Rewrite and expand the following movie description to make it longer, more engaging, and more detailed. Keep it informative and exciting.

Original Description: ${originalDescription}

Create a new, longer description (at least 50-100 words, aim for 1 paragraph) that expands on the story, characters, themes, and makes viewers excited to watch.`;

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a professional movie description writer. Create engaging, concise movie descriptions in a single paragraph." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 250, // Reduced for shorter output
    });

    const generatedDescription = completion.choices[0].message.content?.trim();
    
    if (!generatedDescription) {
      throw new Error('No description generated');
    }

    return generatedDescription;
  } catch (error) {
    // Fallback to original description if AI fails
    return originalDescription;
  }
}

export async function enhanceMovieDescriptionForEmail(
  title: string,
  year: string,
  originalDescription: string
): Promise<string> {
  try {
    const client = getDeepSeekClient();
    
    const prompt = `You are writing a movie notification email. Create an engaging description for this new release:

Movie: ${title} (${year})
Original Description: ${originalDescription}

Write a compelling, single-paragraph description (at least 50-100 words) that:
- Opens with an attention-grabbing hook that immediately draws readers in
- Expands on the plot and story elements
- Highlights what makes this movie special and unique
- Creates excitement about watching it
- Maintains a friendly, enthusiastic, professional tone

Write ONLY the description as a single paragraph, no subject lines, greetings, or sign-offs. Make it engaging and concise - this should read like professional movie marketing copy.`;

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert at writing engaging, concise movie descriptions for email notifications. Write single-paragraph descriptions that captivate readers." },
        { role: "user", content: prompt }
      ],
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 250, // Reduced for shorter output
    });

    const enhanced = completion.choices[0].message.content?.trim();
    return enhanced || originalDescription;
  } catch (error) {
    return originalDescription;
  }
}
