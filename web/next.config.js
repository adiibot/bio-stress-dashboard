const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/bio-stress-dashboard" : "";

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  experimental: {
    largePageDataBytes: 1024 * 1024 * 8,
  },
};
