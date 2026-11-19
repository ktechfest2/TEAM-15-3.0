/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@voteguard/evidence", "@voteguard/shared", "@voteguard/extraction"],
};
export default nextConfig;
