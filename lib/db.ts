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
  notes: Record<string, string> // Add notes field - maps date strings to note content
  tabId: string // Add tabId field to associate goals with tabs
  frequency?: {
    count: number // How many times
    period: "day" | "week" | "month" // Per what period
  }
}

// Define the Tab interface for the database
export interface TabRecord {
  id: string
  name: string
  order: number
}

// Add a database upgrade handler to set order for existing records
class StreakDatabase extends Dexie {
  goals!: Dexie.Table<GoalRecord, string> // Use explicit Dexie namespace for Table
  tabs!: Dexie.Table<TabRecord, string> // New table for tabs

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

    // Upgrade to version 3 - add notes field
    this.version(3)
      .stores({
        goals: "id, title, startDate, endDate, order", // Schema remains the same
      })
      .upgrade((tx) => {
        // Add empty notes object to existing goals
        return tx
          .table("goals")
          .toCollection()
          .modify((goal) => {
            goal.notes = {}
          })
      })

    // Upgrade to version 4 - add tabs
    this.version(4)
      .stores({
        goals: "id, title, startDate, endDate, order, tabId", // Add tabId to the schema
        tabs: "id, name, order", // Add tabs table
      })
      .upgrade(async (tx) => {
        // Create a default tab
        const defaultTabId = crypto.randomUUID()
        await tx.table("tabs").add({
          id: defaultTabId,
          name: "Tab1", // Changed from "General" to "Tab1"
          order: 0,
        })

        // Assign all existing goals to the default tab
        return tx
          .table("goals")
          .toCollection()
          .modify((goal) => {
            goal.tabId = defaultTabId
          })
      })

    // Upgrade to version 5 - add frequency
    this.version(5)
      .stores({
        goals: "id, title, startDate, endDate, order, tabId", // Schema remains the same
      })
      .upgrade((tx) => {
        // No need to modify existing goals, frequency will be undefined for them
        console.log("Upgraded database to version 5 - added frequency support")
      })
  }
}

// Create and export a database instance
export const db = new StreakDatabase()

// Helper functions for database operations
export async function getAllGoals(): Promise<GoalRecord[]> {
  return await db.goals.toArray()
}

export async function getGoalsByTab(tabId: string): Promise<GoalRecord[]> {
  return await db.goals.where("tabId").equals(tabId).toArray()
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

// Add a function to update notes for a specific date
export async function updateGoalNote(id: string, date: string, note: string): Promise<number> {
  // Get the current goal
  const goal = await db.goals.get(id)
  if (!goal) throw new Error("Goal not found")

  // Update the notes object
  const updatedNotes = { ...goal.notes, [date]: note }

  // Save back to the database
  return await db.goals.update(id, { notes: updatedNotes })
}

// Add a function to get notes for a goal
export async function getGoalNotes(id: string): Promise<Record<string, string>> {
  const goal = await db.goals.get(id)
  if (!goal) return {}
  return goal.notes || {}
}

// Tab-related functions
export async function getAllTabs(): Promise<TabRecord[]> {
  return await db.tabs.toArray()
}

export async function addTab(tab: TabRecord): Promise<string> {
  return await db.tabs.add(tab)
}

export async function updateTab(tab: TabRecord): Promise<number> {
  return await db.tabs.update(tab.id, tab)
}

export async function deleteTab(id: string): Promise<void> {
  await db.tabs.delete(id)
}

export async function updateTabOrder(id: string, order: number): Promise<number> {
  return await db.tabs.update(id, { order })
}

export async function updateTabName(id: string, name: string): Promise<number> {
  return await db.tabs.update(id, { name })
}

// Function to move goals to a different tab
export async function moveGoalsToTab(goalIds: string[], targetTabId: string): Promise<void> {
  await db.transaction("rw", db.goals, async () => {
    for (const goalId of goalIds) {
      await db.goals.update(goalId, { tabId: targetTabId })
    }
  })
}

// Function to delete a tab and move its goals to another tab
export async function deleteTabAndMoveGoals(tabId: string, targetTabId: string): Promise<void> {
  await db.transaction("rw", db.goals, db.tabs, async () => {
    // Move all goals from this tab to the target tab
    await db.goals.where("tabId").equals(tabId).modify({ tabId: targetTabId })

    // Delete the tab
    await db.tabs.delete(tabId)
  })
}
