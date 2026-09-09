import type { NextConfig } from "next";

/** One render an hour, and a day of staleness rather than a miss. */
const SOURCES_CACHE_HEADER = {
	key: "Cache-Control",
	value: "public, s-maxage=3600, stale-while-revalidate=86400",
};

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
	 * The accreditation pages, given to the CDN.
	 *
	 * They are the most crawlable thing here - an index and a page per source,
	 * static prose over numbers that move once a week at most - and they are
	 * `force-dynamic`, because three of the readers need a database and the
	 * build has none. So the pages are rendered on request and the answer is
	 * shared: one render serves an hour of readers, and a stale copy may be
	 * served for a day after that while a fresh one is fetched behind it.
	 *
	 * `s-maxage` and not `max-age`: the shared cache holds this, a reader's
	 * browser does not, so a correction reaches everyone on the next revalidate
	 * rather than sitting in a thousand private caches until they expire.
	 */
	async headers() {
		return [
			{
				source: "/sources",
				headers: [SOURCES_CACHE_HEADER],
			},
			{
				source: "/sources/:source",
				headers: [SOURCES_CACHE_HEADER],
			},
		];
	},
};

export default nextConfig;
