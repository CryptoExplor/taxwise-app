
import type {NextConfig} from 'next';

const config: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: ["https://6000-firebase-studio-1753016963200.cluster-ikxjzjhlifcwuroomfkjrx437g.cloudworkstations.dev"]
  },
};

export default config;
