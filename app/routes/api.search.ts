import type { LoaderFunctionArgs } from "react-router";
import { searchShows } from "../lib/tmdb";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiKey = (context as any).cloudflare?.env?.TMDB_API_KEY as string | undefined;
  if (!apiKey) {
    return Response.json(
      { error: "TMDB_API_KEY not configured. Add it via: wrangler secret put TMDB_API_KEY" },
      { status: 500 }
    );
  }

  const results = await searchShows(q, apiKey);
  return Response.json({ results });
}
