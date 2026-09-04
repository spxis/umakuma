import type { NextConfig } from "next";

/** One render an hour, and a day of staleness rather than a miss. */
const SOURCES_CACHE_HEADER = {
	key: "Cache-Control",
	value: "public, s-maxage=3600, stale-while-revalidate=86400",
};

const nextConfig: NextConfig = {
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
