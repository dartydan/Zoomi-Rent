import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);
const isDevelopment = process.env.NODE_ENV === "development";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

export default clerkKey
  ? clerkMiddleware(async (auth, req) => {
      // In development mode, allow access to protected routes without authentication
      if (isProtectedRoute(req) && !isDevelopment) {
        await auth().protect();
      }
    })
  : () => NextResponse.next();
