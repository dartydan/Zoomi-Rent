import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

export default clerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth().protect();
      }
    })
  : () => NextResponse.next();
