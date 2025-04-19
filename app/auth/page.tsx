"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/supabase/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthTabs } from "@/components/auth/auth-tabs"
import { Loader2 } from "lucide-react"

export default function AuthPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  useEffect(() => {
    if (user && !isLoading) {
      router.push(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In to Streak Tracker</h1>
        <AuthTabs />
      </div>
    </div>
  )
}
