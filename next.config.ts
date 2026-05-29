import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Raise body size limit so base64-encoded LinkedIn screenshots (up to 4 MB image → ~5.5 MB
      // base64 data URL + RSC envelope) can be sent to the addScreenshotSource server action.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
