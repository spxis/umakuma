import NextAuth from "next-auth";

import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";

const rawHandler = NextAuth(authOptions);

const executeAuth = async (request: Request): Promise<Response> => {
  const response = await rawHandler(request);
  return response as Response;
};

const handlerGet = (request: Request): Promise<Response> =>
	withApiRouteTelemetry({
		route: "/api/auth/[...nextauth]",
		method: "GET",
		request,
		execute: () => executeAuth(request),
	});

const handlerPost = (request: Request): Promise<Response> =>
	withApiRouteTelemetry({
		route: "/api/auth/[...nextauth]",
		method: "POST",
		request,
		execute: () => executeAuth(request),
	});

export { handlerGet as GET, handlerPost as POST };
