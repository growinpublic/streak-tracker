import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Goal } from "@/components/goal-tracker"
import type { TabRecord } from "@/lib/db"

// Interface for Supabase goal record
interface SupabaseGoal {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  progress: string[]
  color: string
  order: number
  notes: Record<string, string>
  tab_id: string
  frequency?: {
    count: number
    period: "day" | "week" | "month"
  }
  created_at?: string
  updated_at?: string
}

// Interface for Supabase tab record
interface SupabaseTab {
  id: string
  user_id: string
  name: string
  order: number
  created_at?: string
  updated_at?: string
}

// Convert local Goal to Supabase format
export function goalToSupabase(goal: Goal, userId: string): SupabaseGoal {
  return {
    id: goal.id,
    user_id: userId,
    title: goal.title,
    start_date: goal.startDate.toISOString(),
    end_date: goal.endDate.toISOString(),
    progress: goal.progress,
    color: goal.color,
    order: goal.order,
    notes: goal.notes,
    tab_id: goal.tabId,
    frequency: goal.frequency,
  }
}

// Convert Supabase goal to local format
export function supabaseToGoal(goal: SupabaseGoal): Goal {
  return {
    id: goal.id,
    title: goal.title,
    startDate: new Date(goal.start_date),
    endDate: new Date(goal.end_date),
    progress: goal.progress,
    color: goal.color,
    order: goal.order,
    notes: goal.notes,
    tabId: goal.tab_id,
    frequency: goal.frequency,
  }
}

// Convert local Tab to Supabase format
export function tabToSupabase(tab: TabRecord, userId: string): SupabaseTab {
  return {
    id: tab.id,
    user_id: userId,
    name: tab.name,
    order: tab.order,
  }
}

// Convert Supabase tab to local format
export function supabaseToTab(tab: SupabaseTab): TabRecord {
  return {
    id: tab.id,
    name: tab.name,
    order: tab.order,
  }
}

// Database operations class
export class SupabaseDB {
  private supabase: SupabaseClient
  private userId: string | undefined

  constructor(userId?: string) {
    this.supabase = createClientComponentClient()
    this.userId = userId
  }

  // Set user ID
  setUserId(userId: string) {
    this.userId = userId
  }

  // Get all goals for the current user
  async getGoals(): Promise<Goal[]> {
    if (!this.userId) throw new Error("User ID is required")

    const { data, error } = await this.supabase
      .from("goals")
      .select("*")
      .eq("user_id", this.userId)
      .order("order", { ascending: true })

    if (error) {
      console.error("Error fetching goals:", error)
      throw error
    }

    return (data as SupabaseGoal[]).map(supabaseToGoal)
  }

  // Get all tabs for the current user
  async getTabs(): Promise<TabRecord[]> {
    if (!this.userId) throw new Error("User ID is required")

    const { data, error } = await this.supabase
      .from("tabs")
      .select("*")
      .eq("user_id", this.userId)
      .order("order", { ascending: true })

    if (error) {
      console.error("Error fetching tabs:", error)
      throw error
    }

    return (data as SupabaseTab[]).map(supabaseToTab)
  }

  // Upsert a goal (insert or update)
  async upsertGoal(goal: Goal): Promise<void> {
    if (!this.userId) throw new Error("User ID is required")

    const { error } = await this.supabase.from("goals").upsert(goalToSupabase(goal, this.userId), { onConflict: "id" })

    if (error) {
      console.error("Error upserting goal:", error)
      throw error
    }
  }

  // Upsert a tab (insert or update)
  async upsertTab(tab: TabRecord): Promise<void> {
    if (!this.userId) throw new Error("User ID is required")

    const { error } = await this.supabase.from("tabs").upsert(tabToSupabase(tab, this.userId), { onConflict: "id" })

    if (error) {
      console.error("Error upserting tab:", error)
      throw error
    }
  }

  // Delete a goal
  async deleteGoal(goalId: string): Promise<void> {
    if (!this.userId) throw new Error("User ID is required")

    const { error } = await this.supabase.from("goals").delete().eq("id", goalId).eq("user_id", this.userId)

    if (error) {
      console.error("Error deleting goal:", error)
      throw error
    }
  }

  // Delete a tab
  async deleteTab(tabId: string): Promise<void> {
    if (!this.userId) throw new Error("User ID is required")

    const { error } = await this.supabase.from("tabs").delete().eq("id", tabId).eq("user_id", this.userId)

    if (error) {
      console.error("Error deleting tab:", error)
      throw error
    }
  }

  // Sync local data to Supabase
  async syncLocalToSupabase(goals: Goal[], tabs: TabRecord[]): Promise<void> {
    if (!this.userId) throw new Error("User ID is required")

    // Start a transaction
    const transaction = async () => {
      // Upsert all tabs
      for (const tab of tabs) {
        await this.upsertTab(tab)
      }

      // Upsert all goals
      for (const goal of goals) {
        await this.upsertGoal(goal)
      }
    }

    try {
      await transaction()
    } catch (error) {
      console.error("Error syncing data to Supabase:", error)
      throw error
    }
  }

  // Sync Supabase data to local
  async syncSupabaseToLocal(): Promise<{ goals: Goal[]; tabs: TabRecord[] }> {
    if (!this.userId) throw new Error("User ID is required")

    try {
      const goals = await this.getGoals()
      const tabs = await this.getTabs()
      return { goals, tabs }
    } catch (error) {
      console.error("Error syncing data from Supabase:", error)
      throw error
    }
  }
}

// Create a singleton instance
let supabaseDB: SupabaseDB | null = null

// Get the instance
export function getSupabaseDB(userId?: string): SupabaseDB {
  if (!supabaseDB) {
    supabaseDB = new SupabaseDB(userId)
  } else if (userId) {
    supabaseDB.setUserId(userId)
  }
  return supabaseDB
}
