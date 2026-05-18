// lib/movieUtils.ts
// const API_BASE_URL = 'https://api.themoviedb.org/3';
// const headers = {
//   Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
//   'Content-Type': 'application/json',
// };

export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
}

export const searchMovie = async (title: string): Promise<Movie | null> => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    return data.results[0] || null;
  } catch (error) {
    return null;
  }
};

export const findMoviesInText = async (text: string): Promise<Movie[]> => {
  const movieTitles = text.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || [];
  const moviePromises = movieTitles.map(title => searchMovie(title));
  const movies = await Promise.all(moviePromises);
  return movies.filter((movie): movie is Movie => movie !== null);
};

export const formatMovieTitle = (text: string): string => {
  return text.replace(
    /"([^"]+)"/g,
    '<span class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold">$1</span>'
  );
};

export function formatAIResponse(content: string) {
  // First, wrap the content in a div to ensure proper HTML parsing
  let formattedContent = content;

  // Format bullet points into proper HTML list
  formattedContent = formattedContent.replace(
    /•\s+(.*?)(?=(?:\n•|\n\n|$))/g,
    '<li>$1</li>'
  );

  // Wrap bullet points in ul
  formattedContent = formattedContent.replace(
    /(<li>.*?<\/li>)+/g,
    '<ul class="list-none space-y-2 my-4">$&</ul>'
  );

  // Format the greeting with gradient text
  formattedContent = formattedContent.replace(
    /(👋 Hello|Hi|Hey) (.*?)!/,
    '$1 <span class="font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">$2</span>!'
  );

  return formattedContent;
}

export const extractYear = (text: string): number | null => {
  const yearRegex = /\b(19|20)\d{2}\b/;
  const match = text.match(yearRegex);
  return match ? parseInt(match[0]) : null;
};

export const extractMovieTitles = (text: string): string[] => {
  const titleRegex = /"([^"]+)"/g;
  const titles: string[] = [];
  let match;
  
  while ((match = titleRegex.exec(text)) !== null) {
    titles.push(match[1]);
  }
  
  return titles;
};