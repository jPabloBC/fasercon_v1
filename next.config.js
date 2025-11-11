/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/fasercon_icon.png',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gbdoqxdldyszmfzqzmuk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gbdoqxdldyszmfzqzmuk.supabase.co',
        port: '',
        // Allow signed object URLs which use `/storage/v1/object/sign/...`.
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
}

module.exports = nextConfig