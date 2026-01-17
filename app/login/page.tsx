"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, ArrowLeft, Loader2, Github, Chrome, Mail, Lock } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [role, setRole] = useState<"developer" | "reviewer">("developer")
  const [isLoading, setIsLoading] = useState<"github" | "google" | "email" | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    // Check if user is already logged in and redirect
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push("/")
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const roleParam = searchParams.get("role")
    if (roleParam === "reviewer" || roleParam === "developer") {
      setRole(roleParam)
    }
  }, [searchParams])

  const handleGitHubSignIn = async () => {
    setIsLoading("github")

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
          queryParams: {
            // Request repo scope for webhook management
            scope: "repo read:user user:email",
          },
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      toast.error(errorMessage)
      setIsLoading(null)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading("google")

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      })

      if (error) throw error
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      toast.error(errorMessage)
      setIsLoading(null)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading("email")

    try {
      const supabase = createClient()

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        })

        if (error) throw error

        toast.success("Check your email to confirm your account!")
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Update user metadata with role if not already set
        const currentUser = data.user
        if (currentUser) {
          const currentRole = currentUser.user_metadata?.role
          if (!currentRole || currentRole !== role) {
            const { error: updateError } = await supabase.auth.updateUser({
              data: { role: role }
            })
            if (updateError) {
              console.error("Failed to update user role:", updateError)
            }
          }
        }

        toast.success("Welcome back!")

        // Redirect based on role
        router.push("/")
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
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
            <CardTitle>{isSignUp ? "Create account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {role === "developer"
                ? "Generate AI-powered updates for your reviewers"
                : "View project updates and ask questions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {role === "developer" ? (
              // Developer: GitHub only
              <>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleGitHubSignIn}
                  disabled={isLoading !== null}
                >
                  {isLoading === "github" ? (
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
                  GitHub required for repository verification
                </p>
              </>
            ) : (
              // Reviewer: Google + Email/Password
              <>
                {/* Google Sign In */}
                <Button 
                  variant="outline"
                  className="w-full" 
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading !== null}
                >
                  {isLoading === "google" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Chrome className="h-5 w-5" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="email">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading !== null}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                        disabled={isLoading !== null}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading !== null}>
                    {isLoading === "email" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Please wait...
                      </>
                    ) : isSignUp ? (
                      "Create account"
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:underline font-medium cursor-pointer"
                    disabled={isLoading !== null}
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </>
            )}
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
