/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/db', '@repo/ui'].filter(Boolean),
  typedRoutes: true,
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
