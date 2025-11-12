import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Suppress turbopack warnings for missing optional dependencies
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig
