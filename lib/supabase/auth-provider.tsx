"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, User, Session } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  session: Session | null
  supabase: SupabaseClient
  isLoading: boolean
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    error: any | null
    success: boolean
  }>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: any | null
    success: boolean
  }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Initialize the Supabase client
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get the current session and user
    const getSession = async () => {
      setIsLoading(true)

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          return
        }

        if (session) {
          setSession(session)
          setUser(session.user)
        }
      } catch (error) {
        console.error("Unexpected error during getSession:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Set up the auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Refresh the page to update server components
      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
        router.refresh()
      }
    })

    // Clean up the subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      return {
        error,
        success: !error,
      }
    } catch (error) {
      console.error("Error during sign up:", error)
      return {
        error,
        success: false,
      }
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return {
        error,
        success: !error,
      }
    } catch (error) {
      console.error("Error during sign in:", error)
      return {
        error,
        success: false,
      }
    }
  }

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    supabase,
    isLoading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
