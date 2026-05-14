import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("discover", "routes/discover.tsx"),
  route("api/search", "routes/api.search.ts"),
  route("api/recommend", "routes/api.recommend.ts"),
] satisfies RouteConfig;
