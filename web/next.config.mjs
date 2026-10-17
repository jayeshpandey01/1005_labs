import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hasRootWorkspace = fs.existsSync(path.join(__dirname, "../package.json"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(hasRootWorkspace ? { outputFileTracingRoot: path.join(__dirname, "../") } : {}),
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*", "./public/**/*"],
  },
};

export default nextConfig;
