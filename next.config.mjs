/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle winston and other Node.js modules that shouldn't be bundled for the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'fs-extra': false,
        'winston': false,
        'node:stream': false,
        'node:fs': false,
        'node:path': false,
        'node:crypto': false,
        'node:util': false,
        'node:buffer': false,
        'node:events': false,
        'node:process': false,
        'node:os': false,
        'node:url': false,
        'node:querystring': false,
        'node:http': false,
        'node:https': false,
        'node:zlib': false,
        'node:net': false,
        'node:tls': false,
      }
    }
    return config
  },
}

export default nextConfig
