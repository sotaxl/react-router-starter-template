import { useState, useRef, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import { parseNetflixCSV } from "../lib/netflix-parser";

export function meta() {
  return [
    { title: "ReelRadar — Find Hidden Gems" },
    {
      name: "description",
      content: "Discover TV shows you'll love without the ad-driven algorithm bias.",
    },
  ];
}

interface SearchResult {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  vote_average: number;
  popularity: number;
}

interface SelectedShow {
  id: number;
  name: string;
  year: string;
  posterUrl: string | null;
}

interface Recommendation {
  id: number;
  name: string;
  overview: string;
  posterUrl: string;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  networks: string[];
  firstAirDate: string;
  originalLanguage: string;
  score: number;
  isHiddenGem: boolean;
  matchReasons: string[];
  numberOfSeasons?: number;
}

const POSTER_SM = "https://image.tmdb.org/t/p/w185";

export default function Discover() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedShows, setSelectedShows] = useState<SelectedShow[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netflixStatus, setNetflixStatus] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addShow(result: SearchResult) {
    if (selectedShows.some((s) => s.id === result.id)) return;
    if (selectedShows.length >= 10) return;
    setSelectedShows((prev) => [
      ...prev,
      {
        id: result.id,
        name: result.name,
        year: result.first_air_date?.split("-")[0] ?? "",
        posterUrl: result.poster_path ? `${POSTER_SM}${result.poster_path}` : null,
      },
    ]);
    setQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  }

  function removeShow(id: number) {
    setSelectedShows((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleNetflixImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNetflixStatus("Parsing your Netflix history…");

    const text = await file.text();
    const parsed = parseNetflixCSV(text);

    if (parsed.length === 0) {
      setNetflixStatus(
        "No shows found. Make sure it's the NetflixViewingHistory.csv file."
      );
      return;
    }

    setNetflixStatus(`Found ${parsed.length} unique shows. Matching to database…`);
    let matched = 0;

    for (const show of parsed.slice(0, 15)) {
      if (selectedShows.length >= 10) break;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(show.title)}`
        );
        const data = await res.json();
        const best: SearchResult | undefined = data.results?.[0];
        if (best && !selectedShows.some((s) => s.id === best.id)) {
          setSelectedShows((prev) => [
            ...prev,
            {
              id: best.id,
              name: best.name,
              year: best.first_air_date?.split("-")[0] ?? "",
              posterUrl: best.poster_path
                ? `${POSTER_SM}${best.poster_path}`
                : null,
            },
          ]);
          matched++;
        }
      } catch {
        /* skip unmatched */
      }
    }

    setNetflixStatus(
      `Imported ${matched} shows from Netflix history. Add more manually if needed.`
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function findRecommendations() {
    if (!selectedShows.length) return;
    setLoading(true);
    setError(null);
    setRecommendations([]);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showIds: selectedShows.map((s) => s.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get recommendations");
      setRecommendations(data.results ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-white">
            Reel<span className="text-violet-400">Radar</span>
          </a>
          <p className="text-sm text-gray-500 hidden sm:block">
            No ads. No bias. Just great shows.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Left: Input panel */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Find Your Next Obsession
              </h1>
              <p className="text-gray-400 text-sm">
                Add up to 10 shows you love, then hit the button.
              </p>
            </div>

            {/* Search */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() =>
                    searchResults.length > 0 && setShowDropdown(true)
                  }
                  placeholder={
                    selectedShows.length >= 10
                      ? "Max 10 shows reached"
                      : "Search for a show…"
                  }
                  disabled={selectedShows.length >= 10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 pr-10"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => addShow(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                    >
                      <img
                        src={
                          result.poster_path
                            ? `${POSTER_SM}${result.poster_path}`
                            : "https://placehold.co/32x48/374151/6b7280?text="
                        }
                        alt=""
                        className="w-8 h-12 object-cover rounded flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {result.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {result.first_air_date?.split("-")[0]} ·{" "}
                          {result.vote_average?.toFixed(1)} ★
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected shows */}
            {selectedShows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Your Shows ({selectedShows.length}/10)
                </p>
                {selectedShows.map((show) => (
                  <div
                    key={show.id}
                    className="flex items-center gap-3 bg-gray-800/60 rounded-lg px-3 py-2"
                  >
                    {show.posterUrl ? (
                      <img
                        src={show.posterUrl}
                        alt=""
                        className="w-8 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-gray-700 rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {show.name}
                      </div>
                      {show.year && (
                        <div className="text-xs text-gray-400">{show.year}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeShow(show.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      aria-label="Remove"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Netflix import */}
            <div className="border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.616l2.127-6.026L18.298 24 24 0h-5.026l-3.567 9.94-3.777-9.94H5.398z" />
                </svg>
                <span className="text-sm font-medium text-white">
                  Import Netflix History
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Netflix → Account → Security → Download your personal
                information. Upload the{" "}
                <code className="text-gray-300">NetflixViewingHistory.csv</code>{" "}
                file here.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleNetflixImport}
                className="hidden"
                id="netflix-upload"
              />
              <label
                htmlFor="netflix-upload"
                className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg cursor-pointer transition-colors"
              >
                Upload CSV
              </label>
              {netflixStatus && (
                <p className="text-xs text-gray-400">{netflixStatus}</p>
              )}
            </div>

            {/* Find button */}
            <button
              onClick={findRecommendations}
              disabled={selectedShows.length === 0 || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scanning the database…
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Find Hidden Gems
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div>
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-white font-medium">
                    Scanning the universe of shows…
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Analyzing themes, ratings, and hidden patterns
                  </p>
                </div>
              </div>
            )}

            {!loading && recommendations.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="text-6xl">🎬</div>
                <div>
                  <p className="text-white font-medium text-lg">
                    Add some shows to get started
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    The more you add, the better the taste profile
                  </p>
                </div>
              </div>
            )}

            {!loading && recommendations.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {recommendations.length} Recommendations
                  </h2>
                  <span className="text-sm text-gray-500">Sorted by match score</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recommendations.map((rec) => (
                    <ShowCard key={rec.id} rec={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  const langNames: Record<string, string> = {
    ko: "Korean", ja: "Japanese", es: "Spanish", fr: "French",
    de: "German", it: "Italian", pt: "Portuguese", sv: "Swedish",
    da: "Danish", no: "Norwegian", zh: "Chinese", tr: "Turkish",
    nl: "Dutch", fi: "Finnish", pl: "Polish", ru: "Russian",
    hi: "Hindi", ar: "Arabic",
  };

  return (
    <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/50 hover:border-violet-500/50 transition-all duration-200">
      <div className="relative">
        <img
          src={rec.posterUrl}
          alt={rec.name}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
        {rec.isHiddenGem && (
          <div className="absolute top-2 left-2 bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            Hidden Gem
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
          ★ {rec.voteAverage.toFixed(1)}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">
            {rec.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">
              {rec.firstAirDate?.split("-")[0]}
            </span>
            {rec.numberOfSeasons && (
              <span className="text-xs text-gray-400">
                {rec.numberOfSeasons}S
              </span>
            )}
            {rec.originalLanguage !== "en" && (
              <span className="text-xs text-violet-400">
                {langNames[rec.originalLanguage] ??
                  rec.originalLanguage.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {rec.genres.slice(0, 2).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rec.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {rec.matchReasons.length > 0 && (
          <div className="space-y-0.5">
            {rec.matchReasons.slice(0, 3).map((reason, i) => (
              <div
                key={i}
                className="text-xs text-gray-400 flex items-start gap-1"
              >
                <span className="text-violet-400 flex-shrink-0 mt-0.5">✓</span>
                <span className="line-clamp-1">{reason}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {expanded ? "Less" : "About"}
        </button>

        {expanded && rec.overview && (
          <p className="text-xs text-gray-400 leading-relaxed">
            {rec.overview.slice(0, 220)}
            {rec.overview.length > 220 ? "…" : ""}
          </p>
        )}

        {rec.networks.length > 0 && (
          <div className="text-xs text-gray-600 truncate">
            {rec.networks.slice(0, 2).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
