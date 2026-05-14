import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ReelRadar — Discover Shows Worth Watching" },
    {
      name: "description",
      content:
        "Find TV shows based on what you actually love — not what advertisers pay to promote.",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold">
            Reel<span className="text-violet-400">Radar</span>
          </span>
          <a
            href="/discover"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Open App →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-900/30 border border-violet-700/50 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            No ads. No sponsored slots. Just your actual taste.
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Discover Shows
            <br />
            <span className="text-violet-400">The Algorithm Hides</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Tell us what you love. We analyze genres, themes, tone, and real
            ratings—not what Netflix wants you to watch—to surface your next
            obsession.
          </p>
          <a
            href="/discover"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40"
          >
            Start Discovering
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Add Your Favorites",
              desc: "Type shows you already love, or import your Netflix viewing history CSV for a full taste profile.",
              icon: "📺",
            },
            {
              step: "02",
              title: "Algorithm Runs Deep",
              desc: "We analyze genres, themes, tone, era, networks, and real audience ratings—not promoted content.",
              icon: "🧠",
            },
            {
              step: "03",
              title: "Get Hidden Gems",
              desc: "A ranked list with match explanations. We boost underrated, international, and overlooked content.",
              icon: "💎",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <div className="text-xs text-violet-400 font-mono mb-2">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm explainer */}
      <div className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">
              The Anti-Algorithm Algorithm
            </h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Streaming platforms optimize for watch time and ad revenue. They
              push content with big marketing budgets. We do the opposite.
            </p>
            <ul className="space-y-3">
              {[
                "Boosts shows with high ratings but low mainstream visibility",
                "Rewards international and non-English content",
                "Weighs thematic keywords and narrative tone from TMDB",
                "Penalizes over-promoted blockbuster content",
                "Surfaces cult classics with passionate niche audiences",
                "Import Netflix history for a precise taste fingerprint",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <span className="text-violet-400 mt-0.5 flex-shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 font-mono text-sm space-y-2">
            <div className="text-violet-400 text-xs mb-4">// scoring weights</div>
            {[
              ["genre", "similarity", "30%"],
              ["theme", "/ keyword match", "28%"],
              ["quality", "score", "15%"],
              ["network", "affinity", "10%"],
              ["language", "preference", "10%"],
              ["era", "match", "7%"],
            ].map(([key, label, pct]) => (
              <div key={key} className="text-gray-300">
                <span className="text-blue-400">{key}</span>
                <span className="text-gray-500"> {label} </span>
                <span className="text-green-400">{pct}</span>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-1">
              <div className="text-gray-500 text-xs">
                // then apply hidden gem multiplier
              </div>
              <div className="text-yellow-400">
                score × (1 + hiddenGemBonus)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup */}
      <div className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">Setup</h2>
        <p className="text-gray-400 mb-6">
          Powered by the free TMDB API. You need an API key to run this app.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">
              1. Get a free TMDB API key
            </h3>
            <p className="text-sm text-gray-400">
              Sign up at themoviedb.org → Settings → API → Create v3 key.
              Instant, free, no credit card.
            </p>
          </div>
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-white">
              2. Add to your environment
            </h3>
            <code className="block bg-gray-900 rounded-lg p-3 text-xs text-green-400">
              # Production (Cloudflare Workers){"\n"}
              wrangler secret put TMDB_API_KEY{"\n\n"}
              # Local dev{"\n"}
              echo 'TMDB_API_KEY=your_key' &gt;&gt; .dev.vars
            </code>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-600 text-sm">
        ReelRadar — Powered by TMDB API · Not affiliated with any streaming
        service
      </footer>
    </div>
  );
}
