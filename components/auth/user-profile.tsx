"use client"

import { useState } from "react"
import { useAuth } from "@/lib/supabase/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, LogOut } from "lucide-react"

export function UserProfile() {
  const { user, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut()
    setIsLoading(false)
  }

  if (!user) {
    return null
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user.email) return "?"
    return user.email.substring(0, 2).toUpperCase()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.user_metadata?.full_name || user.email}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">User ID:</span>
            <span className="text-sm text-muted-foreground">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Email verified:</span>
            <span className="text-sm text-muted-foreground">{user.email_confirmed_at ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Last sign in:</span>
            <span className="text-sm text-muted-foreground">
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "N/A"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
