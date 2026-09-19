/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images are served by this app's own route (app/api/images/[id]), never by a public URL, so
  // there is nothing to configure here for remote images - and nothing that could accidentally
  // expose a bucket. See README: "How the moderation gate is enforced".
  reactStrictMode: true,
};

export default nextConfig;
