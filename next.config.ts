import type { NextConfig } from "next";
import { execSync } from "child_process";

let commitSha = "local-dev";
try {
  commitSha = execSync("git rev-parse HEAD", { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch (e) {
  commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "fallback-sha-" + Date.now();
}

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  }
};

export default nextConfig;

