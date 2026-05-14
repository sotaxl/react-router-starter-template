import type { ActionFunctionArgs } from "react-router";
import {
  getShowDetails,
  getSimilarAndRecommended,
  discoverByGenres,
  getPosterUrl,
} from "../lib/tmdb";
import { buildTasteProfile, scoreShows } from "../lib/algorithm";

export async function action({ request, context }: ActionFunctionArgs) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKey = (context as any).cloudflare?.env?.TMDB_API_KEY as string | undefined;
  if (!apiKey) {
    return Response.json(
      { error: "TMDB_API_KEY not configured. Add it via: wrangler secret put TMDB_API_KEY" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { showIds?: number[] };
  if (!body.showIds?.length) {
    return Response.json({ error: "No shows provided" }, { status: 400 });
  }

  // Full details for input shows (includes keywords for taste profile)
  const inputShows = (
    await Promise.all(body.showIds.map((id) => getShowDetails(id, apiKey)))
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  if (!inputShows.length) {
    return Response.json({ error: "Could not fetch show details" }, { status: 500 });
  }

  const profile = buildTasteProfile(inputShows);
  const topGenres = Array.from(profile.genreWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  // Gather candidates from similar/recommended + genre-based discovery
  const [simResults, p1, p2, p3] = await Promise.all([
    Promise.all(
      inputShows.map((s) => getSimilarAndRecommended(s.id, apiKey))
    ).then((r) => r.flat()),
    discoverByGenres(topGenres, apiKey, 1),
    discoverByGenres(topGenres, apiKey, 2),
    discoverByGenres(topGenres, apiKey, 3),
  ]);

  const allCandidates = [...simResults, ...p1, ...p2, ...p3];
  const uniqueIds = [
    ...new Set(allCandidates.map((s) => s.id)),
  ]
    .filter((id) => !profile.inputShowIds.has(id))
    .slice(0, 60);

  // Fetch full details in batches of 12 to stay within TMDB rate limits
  const detailedShows: NonNullable<Awaited<ReturnType<typeof getShowDetails>>>[] = [];
  for (let i = 0; i < uniqueIds.length; i += 12) {
    const batch = await Promise.all(
      uniqueIds.slice(i, i + 12).map((id) => getShowDetails(id, apiKey))
    );
    detailedShows.push(
      ...batch.filter((s): s is NonNullable<typeof s> => s !== null)
    );
  }

  const scored = scoreShows(detailedShows, profile);

  const results = scored.slice(0, 24).map(({ show, score, isHiddenGem, matchReasons }) => ({
    id: show.id,
    name: show.name,
    overview: show.overview,
    posterUrl: getPosterUrl(show.poster_path),
    voteAverage: show.vote_average,
    voteCount: show.vote_count,
    genres: (show.genres ?? []).map((g) => g.name),
    networks: (show.networks ?? []).map((n) => n.name),
    firstAirDate: show.first_air_date,
    originalLanguage: show.original_language,
    score: Math.round(score * 100),
    isHiddenGem,
    matchReasons,
    numberOfSeasons: show.number_of_seasons,
  }));

  return Response.json({
    results,
    inputShows: inputShows.map((s) => ({ id: s.id, name: s.name })),
  });
}
