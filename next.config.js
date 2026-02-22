/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['uploadthing.com', 'utfs.io', 'image.mux.com', 'api.dicebear.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    // Build script-src with required sources
    let scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    // Allow pdf.js worker script from unpkg (module URL import)
    scriptSrc += " https://unpkg.com"
    // Allow Vercel Live and gstatic only in non-production
    if (!isProd) {
      scriptSrc += " https://vercel.live https://www.gstatic.com"
    }

    const baseDirectives = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://uploadthing.com https://utfs.io https://*.ufs.sh https://image.mux.com https://api.dicebear.com",
      "font-src 'self' data:",
      // Allow UploadThing ingest regions
      "connect-src 'self' https://api.openai.com https://uploadthing.com https://utfs.io https://*.ufs.sh https://stream.mux.com https://*.mux.com https://*.ingest.uploadthing.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'self' https://*.mux.com",
      "media-src 'self' blob: https://stream.mux.com https://*.mux.com",
      // Allow web workers (pdf.js uses blob workers)
      "worker-src 'self' blob:",
    ]

    const csp = baseDirectives.join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          isProd
            ? { key: 'Content-Security-Policy', value: csp }
            : { key: 'Content-Security-Policy-Report-Only', value: csp },
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