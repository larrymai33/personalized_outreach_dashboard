import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom (used by the scraper) does dynamic requires and ships optional native deps that
  // break Next's serverless bundling on Vercel — load it from node_modules at runtime instead.
  serverExternalPackages: ["jsdom"],
  experimental: {
    serverActions: {
      // Raise body size limit so base64-encoded LinkedIn screenshots (up to 4 MB image → ~5.5 MB
      // base64 data URL + RSC envelope) can be sent to the addScreenshotSource server action.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
