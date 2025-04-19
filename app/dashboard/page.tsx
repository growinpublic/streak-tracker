"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserProfile } from "@/components/auth/user-profile"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="grid gap-6">
          <UserProfile />
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Your Dashboard Content</h2>
            <p className="text-muted-foreground">This is a protected page that only authenticated users can access.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
