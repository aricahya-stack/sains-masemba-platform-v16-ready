import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sh/db', '@sh/core'],
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
