"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserProfile } from "@/components/auth/user-profile"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
        <UserProfile />
      </div>
    </ProtectedRoute>
  )
}
