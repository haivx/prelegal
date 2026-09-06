import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The frontend ships as a fully static bundle (see PREL-4) that FastAPI
  // serves directly. `next build` writes it to `out/`.
  output: "export",
};

export default nextConfig;
