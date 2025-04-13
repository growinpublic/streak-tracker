import { GoalTracker } from "@/components/goal-tracker"
import { Github } from "lucide-react"

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="relative space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Streak Tracker</h1>
            <p className="text-muted-foreground">Set a goal and track your daily habits and streaks.</p>
          </div>
          <a
            href="https://github.com/growinpublic/streak-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
        <GoalTracker />
      </div>
    </main>
  )
}
