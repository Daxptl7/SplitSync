/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  images: {
    domains: ["lh3.googleusercontent.com", "firebasestorage.googleapis.com"],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      {
        // Match paths that already have a trailing slash
        source: "/api/v1/:path*/",
        destination: `${backendUrl}/api/v1/:path*/`,
      },
      {
        // Match paths without a trailing slash and add one
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*/`,
      },
    ];
  },
};

module.exports = nextConfig;
