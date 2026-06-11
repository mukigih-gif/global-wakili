/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();
  },
};

module.exports = nextConfig;
