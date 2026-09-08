/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Object-storage-backed profile photos will be served via signed URLs
    // through a controlled domain once Module 4/verification lands. No
    // remote patterns are whitelisted yet — nothing external is fetched
    // in Module 1.
    remotePatterns: [],
  },
};

module.exports = nextConfig;
