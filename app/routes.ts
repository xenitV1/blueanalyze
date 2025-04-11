import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("trends", "routes/trends.tsx")
] satisfies RouteConfig;
