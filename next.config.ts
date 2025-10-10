import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Suppress turbopack warnings for missing optional dependencies
  experimental: {
    turbo: {
      resolveAlias: {
        // Suppress viem internal module resolution issues
        'viem/_cjs': 'viem',
        'viem/_esm': 'viem',
      },
    },
  },
}

export default nextConfig
