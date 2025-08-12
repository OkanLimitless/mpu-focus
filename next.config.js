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
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: tighten and remove unsafe-* where possible
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://uploadthing.com https://utfs.io https://*.ufs.sh",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://uploadthing.com https://utfs.io https://*.ufs.sh",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'self' https://*.mux.com",
      "media-src 'self' https://stream.mux.com https://*.mux.com",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;