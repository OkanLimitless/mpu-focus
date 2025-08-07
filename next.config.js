/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['uploadthing.com', 'utfs.io'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Configure API route limits for document processing
  experimental: {
    serverComponentsExternalPackages: ['pdf-poppler'],
  },
};

module.exports = nextConfig;