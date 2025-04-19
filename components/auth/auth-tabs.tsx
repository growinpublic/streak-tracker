"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignInForm } from "./sign-in-form"
import { SignUpForm } from "./sign-up-form"
import { MagicLinkForm } from "./magic-link-form"
import { SocialLogin } from "./social-login"

export function AuthTabs() {
  const [activeTab, setActiveTab] = useState("signin")

  return (
    <div className="space-y-6">
      <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
          <TabsTrigger value="magic">Magic Link</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <SignInForm />
          <div className="mt-6">
            <SocialLogin />
          </div>
        </TabsContent>
        <TabsContent value="signup">
          <SignUpForm />
          <div className="mt-6">
            <SocialLogin />
          </div>
        </TabsContent>
        <TabsContent value="magic">
          <MagicLinkForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
