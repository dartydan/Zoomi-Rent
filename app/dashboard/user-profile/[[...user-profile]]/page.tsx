"use client";

import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <div className="min-h-[80vh] w-full py-8">
      <UserProfile path="/dashboard/user-profile" routing="path" />
    </div>
  );
}
