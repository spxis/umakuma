import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

function shouldUseRequestOrigin(origin: string): boolean {
	if (process.env.NODE_ENV === "production") {
		return false;
	}

	try {
		const url = new URL(origin);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

function withDynamicNextAuthUrl(request: Request): void {
	const origin = new URL(request.url).origin;
	if (shouldUseRequestOrigin(origin)) {
		process.env.NEXTAUTH_URL = origin;
	}
}

export async function GET(request: Request, context: unknown) {
	withDynamicNextAuthUrl(request);
	return handler(request, context);
}

export async function POST(request: Request, context: unknown) {
	withDynamicNextAuthUrl(request);
	return handler(request, context);
}
