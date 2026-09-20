/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images are served by this app's own route (app/api/images/[id]), never by a public URL, so
  // there is nothing to configure here for remote images - and nothing that could accidentally
  // expose a bucket. See README: "How the moderation gate is enforced".
  reactStrictMode: true,

  // The submit form and the gallery are sections of the main page now, not routes of their own.
  // Anything still pointing at the old paths lands on the right section rather than a 404.
  async redirects() {
    return [
      { source: "/submit", destination: "/#submit", permanent: false },
      { source: "/gallery", destination: "/#showcase", permanent: false },
    ];
  },
};

export default nextConfig;
