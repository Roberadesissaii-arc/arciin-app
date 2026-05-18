/**
 * OMDB / IMDb-based cards use numeric IMDb ids in `id`, but /movies/[id] expects TMDB ids.
 * TMDB find resolves IMDb tt* ids to the correct movie or TV entity.
 */
export async function resolveTmdbFromImdbId(
  imdbId: string,
  preferTv: boolean
): Promise<{ id: number; mediaType: 'movie' | 'tv' } | null> {
  const token = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
  if (!token || !imdbId?.startsWith('tt')) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    if (preferTv && data.tv_results?.length) {
      return { id: data.tv_results[0].id, mediaType: 'tv' };
    }
    if (data.movie_results?.length) {
      return { id: data.movie_results[0].id, mediaType: 'movie' };
    }
    if (data.tv_results?.length) {
      return { id: data.tv_results[0].id, mediaType: 'tv' };
    }
  } catch {
    return null;
  }
  return null;
}
