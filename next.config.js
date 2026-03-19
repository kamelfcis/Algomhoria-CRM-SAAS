/** @type {import('next').NextConfig} */
const useStandaloneOutput = process.env.NEXT_OUTPUT_MODE === 'standalone'

const nextConfig = {
  reactStrictMode: true,
  output: useStandaloneOutput ? 'standalone' : undefined,
  
  // Enable compression for better performance
  compress: true,
  
  // Image optimization configuration
  images: {
    // Allow images from Supabase storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
    // Optimize images
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

module.exports = nextConfig
