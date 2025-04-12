import Dexie from "dexie"

// Define the Goal interface for the database
export interface GoalRecord {
  id: string
  title: string
  startDate: string // Store dates as ISO strings in the database
  endDate: string
  progress: string[] // Array of ISO date strings
  color: string
  order: number // Add this field for sorting
}

// Add a database upgrade handler to set order for existing records
class StreakDatabase extends Dexie {
  goals!: Dexie.Table<GoalRecord, string> // Use explicit Dexie namespace for Table

  constructor() {
    super("streakTracker")

    // Define the schema for the database
    this.version(1).stores({
      goals: "id, title, startDate, endDate", // Primary key is id, indexes on other fields
    })

    // Upgrade to version 2 - add order field
    this.version(2)
      .stores({
        goals: "id, title, startDate, endDate, order", // Add order to the schema
      })
      .upgrade((tx) => {
        // Set order for existing goals
        return tx
          .table("goals")
          .toCollection()
          .modify((goal, ref) => {
            goal.order = ref.index
          })
      })
  }
}

// Create and export a database instance
export const db = new StreakDatabase()

// Helper functions for database operations
export async function getAllGoals(): Promise<GoalRecord[]> {
  return await db.goals.toArray()
}

export async function addGoal(goal: GoalRecord): Promise<string> {
  return await db.goals.add(goal)
}

export async function updateGoal(goal: GoalRecord): Promise<number> {
  return await db.goals.update(goal.id, goal)
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id)
}

export async function updateGoalProgress(id: string, progress: string[]): Promise<number> {
  return await db.goals.update(id, { progress })
}

// Clear all goals from the database
export async function clearAllGoals(): Promise<void> {
  await db.goals.clear()
}

// Add a function to update goal order
export async function updateGoalOrder(id: string, order: number): Promise<number> {
  return await db.goals.update(id, { order })
}
