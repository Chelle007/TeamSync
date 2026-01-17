"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Video, 
  FileText, 
  MessageSquare, 
  Zap, 
  ArrowRight,
  GitBranch,
  Globe,
  Sparkles
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TeamSync</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login?role=client">Client Login</Link>
            </Button>
            <Button asChild>
              <Link href="/login?role=freelancer">Freelancer Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
            <Sparkles className="h-4 w-4" />
            AI-Powered Client Updates
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] animate-slide-up">
            Keep clients in the loop,{" "}
            <span className="gradient-text">automatically</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: "100ms" }}>
            TeamSync transforms your code commits and staging sites into 
            professional video updates. Save hours on client communication.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Button size="lg" asChild>
              <Link href="/login?role=freelancer">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login?role=client">
                View Demo Portal
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to transform your workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "1. Connect your project",
                description: "Add your staging site URL and GitHub repository. We'll analyze the latest changes.",
              },
              {
                icon: GitBranch,
                title: "2. Generate updates",
                description: "Our AI creates video walkthroughs and documentation from your commits and live site.",
              },
              {
                icon: MessageSquare,
                title: "3. Share with clients",
                description: "Clients view updates and ask questions through an AI assistant you control.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className="relative p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl font-bold">
                Everything your clients need,{" "}
                <span className="gradient-text">nothing they don't</span>
              </h2>

              <div className="space-y-6">
                {[
                  {
                    icon: Video,
                    title: "Video Updates",
                    description: "Automated screen recordings that showcase new features and changes.",
                  },
                  {
                    icon: FileText,
                    title: "Documentation",
                    description: "AI-generated Google Docs with technical details and summaries.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Smart Q&A",
                    description: "Clients ask questions, AI answers. You approve when needed.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-1">
                <div className="w-full h-full rounded-xl bg-card border flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <Video className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Interactive demo coming soon
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_linear_infinite]" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl font-bold text-primary-foreground">
                Ready to streamline client updates?
              </h2>
              <p className="text-primary-foreground/80 max-w-lg mx-auto">
                Join freelancers who save 5+ hours per week on client communication.
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login?role=freelancer">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-sm">TeamSync © 2026</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for Hack&Roll 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
