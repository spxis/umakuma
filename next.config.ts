import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	rewrites: async () => [
		{
			source: "/users/:nickname/study",
			destination: "/users/:nickname?dashboard=learn",
		},
		{
			source: "/users/:nickname/library-explorer",
			destination: "/users/:nickname?dashboard=wk",
		},
		{
			source: "/users/:nickname/wk-explorer",
			destination: "/users/:nickname?dashboard=wk",
		},
		{
			source: "/users/:nickname/jlpt-explorer",
			destination: "/users/:nickname?dashboard=jlpt",
		},
		{
			source: "/users/:nickname/:dashboard(wk|jlpt)",
			destination: "/users/:nickname?dashboard=:dashboard",
		},
		{
			source: "/users/:nickname/:dashboard(learn|stats|news|read)",
			destination: "/users/:nickname?dashboard=:dashboard",
		},
	],
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
};

export default nextConfig;
