import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/*
	 * Next writes its own AGENTS.md and CLAUDE.md unless told not to.
	 *
	 * On this repository those two files are the rules, not a pointer to
	 * them: AGENTS.md is hand-written and is what every agent working here
	 * is held to, and CLAUDE.md exists only to delegate to it. A framework
	 * that regenerates both on every `next dev` is editing the instructions
	 * while they are being followed, and it leaves the tree dirty in a way
	 * that rides along with the `git add -A` in the release chain - which is
	 * how a generated block nearly reached a release commit the day 16.3.4
	 * landed.
	 *
	 * Nothing is lost by refusing it. What Next generates is a pointer to
	 * the version-matched docs under `node_modules/next/dist/docs/`, and the
	 * opening line of our own AGENTS.md already says exactly that.
	 */
	agentRules: false,
	images: {
		dangerouslyAllowSVG: true,
		contentDispositionType: "inline",
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		remotePatterns: [
			{
				protocol: "https",
				hostname: "covers.openlibrary.org",
			},
			{
				protocol: "https",
				hostname: "cover.openbd.jp",
			},
			{
				protocol: "https",
				hostname: "books.google.com",
			},
			{
				protocol: "https",
				hostname: "books.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
		],
	},
	/*
	 * No CDN header on the accreditation pages, and that is not an oversight.
	 *
	 * There was one - `public, s-maxage=3600, stale-while-revalidate=86400` on
	 * `/sources` and `/sources/:source` - and it never served a single request.
	 * Both pages are `force-dynamic`, because three of the twelve reports read
	 * the database and the build has none; Next sends `no-cache, no-store` on a
	 * dynamic route, and that overrides anything set here. Production was
	 * checked on 2026-09-03 and returned `x-vercel-cache: MISS` every time. The
	 * header stayed for six days anyway, with a comment claiming the render was
	 * shared and a unit test asserting the header's own text, so the suite kept
	 * reporting a cache that had never once answered anybody.
	 *
	 * What actually spares the app a crawler's sweep is `sourceReportCache.ts`,
	 * an in-process cache with a ten-minute life. That is real, and it stays.
	 *
	 * A header here can only start working once these pages stop being dynamic,
	 * which is cmtmh1y2j and a site-wide rendering change. Whoever takes that on
	 * should add this back deliberately, and should know first that these pages
	 * render the viewer's own header: a shared cache over that HTML hands one
	 * member's menu to the next reader.
	 */
};

export default nextConfig;
