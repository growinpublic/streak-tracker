import { GoalTracker } from "@/components/goal-tracker"

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Streak Tracker</h1>
          <p className="hidden sm:block text-muted-foreground">Set a goal and track your daily habits and streaks.</p>
        </div>
      </div>

      {/* GoalTracker is now directly in the page layout */}
      <GoalTracker />
    </main>
  )
}
