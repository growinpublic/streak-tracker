import { GoalTracker } from "@/components/goal-tracker"

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-[1200px] mx-auto mb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Streaks</h1>
          <p className="hidden sm:block text-muted-foreground">Set a goal and track your daily habits and streaks.</p>
        </div>
      </div>

      {/* GoalTracker with consistent container */}
      <GoalTracker />
    </main>
  )
}
