const TMDB_BASE = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p";

export interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  genres: { id: number; name: string }[];
  keywords?: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  origin_country: string[];
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  number_of_seasons?: number;
  status?: string;
}

export interface TMDBSearchResult {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

export function getPosterUrl(
  path: string | null,
  size: "w185" | "w342" | "w500" = "w342"
): string {
  return path
    ? `${IMG_BASE}/${size}${path}`
    : `https://placehold.co/342x513/1a1a2e/6b7280?text=No+Poster`;
}

async function tmdbFetch<T>(path: string, apiKey: string): Promise<T | null> {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${apiKey}`);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function searchShows(
  query: string,
  apiKey: string
): Promise<TMDBSearchResult[]> {
  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    `/search/tv?query=${encodeURIComponent(query)}&page=1`,
    apiKey
  );
  return (data?.results ?? []).slice(0, 6);
}

export async function getShowDetails(
  id: number,
  apiKey: string
): Promise<TMDBShow | null> {
  const [details, keywords] = await Promise.all([
    tmdbFetch<TMDBShow>(`/tv/${id}`, apiKey),
    tmdbFetch<{ results: { id: number; name: string }[] }>(
      `/tv/${id}/keywords`,
      apiKey
    ),
  ]);
  if (!details) return null;
  return { ...details, keywords: keywords?.results ?? [] };
}

export async function getSimilarAndRecommended(
  id: number,
  apiKey: string
): Promise<TMDBSearchResult[]> {
  const [similar, recommended] = await Promise.all([
    tmdbFetch<{ results: TMDBSearchResult[] }>(
      `/tv/${id}/similar?page=1`,
      apiKey
    ),
    tmdbFetch<{ results: TMDBSearchResult[] }>(
      `/tv/${id}/recommendations?page=1`,
      apiKey
    ),
  ]);
  const combined = [
    ...(similar?.results ?? []),
    ...(recommended?.results ?? []),
  ];
  const seen = new Set<number>();
  return combined.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export async function discoverByGenres(
  genreIds: number[],
  apiKey: string,
  page = 1
): Promise<TMDBSearchResult[]> {
  if (genreIds.length === 0) return [];
  const genreStr = genreIds.slice(0, 3).join(",");
  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    `/discover/tv?with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`,
    apiKey
  );
  return data?.results ?? [];
}
