/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images are served by this app's own route (app/api/images/[id]), never by a public URL, so
  // there is nothing to configure here for remote images - and nothing that could accidentally
  // expose a bucket. See README: "How the moderation gate is enforced".
  reactStrictMode: true,

  // Catalyst Designs lives at /designs now (the home page is the Catalyst site). The old paths land
  // on the right section rather than a 404; the old "/#vote"-style links are sent on by the home page
  // itself (components/site/hash-redirect.tsx), since a #fragment never reaches the server.
  async redirects() {
    return [
      { source: "/submit", destination: "/designs#submit", permanent: false },
      { source: "/gallery", destination: "/designs#gallery", permanent: false },
      { source: "/vote", destination: "/designs#vote", permanent: false },
    ];
  },
};

export default nextConfig;
