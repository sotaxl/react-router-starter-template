import type { TMDBShow } from "./tmdb";

export interface TasteProfile {
  genreWeights: Map<number, number>;
  keywordWeights: Map<string, number>;
  networkWeights: Map<string, number>;
  languageWeights: Map<string, number>;
  eraWeights: Map<number, number>;
  inputShowIds: Set<number>;
}

export interface ScoredShow {
  show: TMDBShow;
  score: number;
  isHiddenGem: boolean;
  matchReasons: string[];
}

function getDecade(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const year = parseInt(dateStr.split("-")[0]);
  return isNaN(year) ? 0 : Math.floor(year / 10) * 10;
}

/**
 * How much of the profile's weighted signal appears in the candidate's values.
 * Returns 0–1.
 */
function profileOverlap(
  profileMap: Map<string | number, number>,
  showValues: (string | number)[]
): number {
  if (showValues.length === 0 || profileMap.size === 0) return 0;
  let matched = 0;
  let profileTotal = 0;
  for (const [, w] of profileMap) profileTotal += w;
  for (const v of showValues) {
    matched += profileMap.get(v) ?? 0;
  }
  return Math.min(1, matched / Math.max(1, profileTotal * 0.35));
}

export function buildTasteProfile(shows: TMDBShow[]): TasteProfile {
  const genreWeights = new Map<number, number>();
  const keywordWeights = new Map<string, number>();
  const networkWeights = new Map<string, number>();
  const languageWeights = new Map<string, number>();
  const eraWeights = new Map<number, number>();

  for (const show of shows) {
    for (const g of show.genres ?? []) {
      genreWeights.set(g.id, (genreWeights.get(g.id) ?? 0) + 1);
    }
    for (const k of show.keywords ?? []) {
      const key = k.name.toLowerCase();
      keywordWeights.set(key, (keywordWeights.get(key) ?? 0) + 1);
    }
    for (const n of show.networks ?? []) {
      networkWeights.set(n.name, (networkWeights.get(n.name) ?? 0) + 1);
    }
    const lang = show.original_language ?? "en";
    languageWeights.set(lang, (languageWeights.get(lang) ?? 0) + 1);
    const decade = getDecade(show.first_air_date);
    if (decade > 0) eraWeights.set(decade, (eraWeights.get(decade) ?? 0) + 1);
  }

  return {
    genreWeights,
    keywordWeights,
    networkWeights,
    languageWeights,
    eraWeights,
    inputShowIds: new Set(shows.map((s) => s.id)),
  };
}

/**
 * Scores how "hidden gem" a show is.
 * Positive = under the radar, negative = over-exposed.
 */
function hiddenGemScore(show: TMDBShow): number {
  const { vote_average = 0, vote_count = 0, popularity = 0, original_language = "en" } = show;
  let score = 0;

  // High quality but not widely known
  if (vote_average >= 8.0 && vote_count < 3_000) score += 1.2;
  else if (vote_average >= 7.5 && vote_count < 8_000) score += 0.9;
  else if (vote_average >= 7.0 && vote_count < 20_000) score += 0.5;
  else if (vote_average >= 6.5 && vote_count < 5_000) score += 0.3;

  // Mainstream penalty
  if (vote_count > 300_000) score -= 0.8;
  else if (vote_count > 150_000) score -= 0.5;
  else if (vote_count > 80_000) score -= 0.2;

  if (popularity > 300) score -= 0.5;
  else if (popularity > 150) score -= 0.2;

  // International content bonus
  if (original_language !== "en") score += 0.35;

  // Cult classic: old but acclaimed
  const year = parseInt(show.first_air_date?.split("-")[0] ?? "0");
  if (year > 0 && year < 2012 && vote_average >= 7.5) score += 0.25;

  return score;
}

export function scoreShows(
  candidates: TMDBShow[],
  profile: TasteProfile
): ScoredShow[] {
  const langNames: Record<string, string> = {
    ko: "Korean", ja: "Japanese", es: "Spanish", fr: "French",
    de: "German", it: "Italian", pt: "Portuguese", sv: "Swedish",
    da: "Danish", no: "Norwegian", zh: "Chinese", tr: "Turkish",
    nl: "Dutch", fi: "Finnish", pl: "Polish", ru: "Russian",
    hi: "Hindi", ar: "Arabic", th: "Thai", id: "Indonesian",
  };

  return candidates
    .filter((s) => !profile.inputShowIds.has(s.id))
    .filter((s) => (s.vote_average ?? 0) >= 6.5 && (s.vote_count ?? 0) >= 50)
    .map((show) => {
      const reasons: string[] = [];

      // Genre similarity (30%)
      const showGenreIds = (show.genres ?? []).map((g) => g.id);
      const genreSim = profileOverlap(
        profile.genreWeights as Map<string | number, number>,
        showGenreIds
      );
      if (genreSim > 0.25) {
        const matched = (show.genres ?? [])
          .filter((g) => profile.genreWeights.has(g.id))
          .map((g) => g.name)
          .slice(0, 2);
        if (matched.length) reasons.push(`Genres: ${matched.join(", ")}`);
      }

      // Keyword/theme similarity (28%)
      const showKeywords = (show.keywords ?? []).map((k) => k.name.toLowerCase());
      const keySim = profileOverlap(
        profile.keywordWeights as Map<string | number, number>,
        showKeywords
      );
      const matchedKeys = showKeywords
        .filter((k) => (profile.keywordWeights.get(k) ?? 0) > 0)
        .slice(0, 3);
      if (matchedKeys.length) reasons.push(`Themes: ${matchedKeys.join(", ")}`);

      // Network affinity (10%)
      const showNetworks = (show.networks ?? []).map((n) => n.name);
      const netSim = profileOverlap(
        profile.networkWeights as Map<string | number, number>,
        showNetworks
      );

      // Language preference (10%)
      const langScore =
        (profile.languageWeights.get(show.original_language) ?? 0) > 0 ? 1 : 0;

      // Era match (7%)
      const decade = getDecade(show.first_air_date);
      const eraScore =
        decade > 0 && (profile.eraWeights.get(decade) ?? 0) > 0 ? 1 : 0;

      // Raw quality (15%)
      const qualityScore = Math.max(0, ((show.vote_average ?? 0) - 6) / 4);

      const baseScore =
        genreSim * 0.30 +
        keySim * 0.28 +
        netSim * 0.10 +
        langScore * 0.10 +
        eraScore * 0.07 +
        qualityScore * 0.15;

      const hgScore = hiddenGemScore(show);
      const finalScore = baseScore * (1 + Math.max(0, hgScore) * 0.35);

      if (show.original_language !== "en") {
        const langName =
          langNames[show.original_language] ||
          show.original_language.toUpperCase();
        reasons.push(`${langName} original`);
      }
      if (hgScore > 0.7) reasons.push("Hidden gem");
      else if (hgScore > 0.3) reasons.push("Under the radar");
      if ((show.vote_average ?? 0) >= 8.0)
        reasons.push(`${show.vote_average?.toFixed(1)}/10 rated`);

      return {
        show,
        score: finalScore,
        isHiddenGem: hgScore > 0.5,
        matchReasons: [...new Set(reasons)].slice(0, 4),
      };
    })
    .sort((a, b) => b.score - a.score);
}
