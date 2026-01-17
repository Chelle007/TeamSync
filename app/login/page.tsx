"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, ArrowLeft, Loader2, Github } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [role, setRole] = useState<"developer" | "reviewer">("developer")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const roleParam = searchParams.get("role")
    if (roleParam === "reviewer" || roleParam === "developer") {
      setRole(roleParam)
    }
  }, [searchParams])

  const handleGitHubSignIn = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      toast.error(errorMessage)
      setIsLoading(false)
    }
  }

  const handleDemoLogin = () => {
    // For hackathon demo - bypass auth
    toast.success("Demo mode activated!")
    if (role === "developer") {
      router.push("/dashboard")
    } else {
      router.push("/portal/demo-project")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight">TeamSync</span>
        </div>

        {/* Role Toggle */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setRole("developer")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all cursor-pointer ${
              role === "developer"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Developer
          </button>
          <button
            type="button"
            onClick={() => setRole("reviewer")}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all cursor-pointer ${
              role === "reviewer"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reviewer
          </button>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle>Welcome to TeamSync</CardTitle>
            <CardDescription>
              {role === "developer"
                ? "Generate AI-powered updates for your reviewers"
                : "View project updates and ask questions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GitHub Sign In */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleGitHubSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="h-5 w-5" />
                  Continue with GitHub
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {role === "developer" 
                ? "GitHub required for repository verification"
                : "Sign in with your GitHub account"}
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Demo button for hackathon */}
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Continue with Demo Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
