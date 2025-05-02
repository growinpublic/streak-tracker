"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/supabase/auth-provider"
import { getSupabaseDB } from "@/lib/supabase/database"
import { getAllGoals, getAllTabs, db } from "@/lib/db"
import { recordToGoal } from "@/components/goal-tracker"
import { Cloud, CloudOff, Download, Upload, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Helper function to check if user is fully authenticated
const isFullyAuthenticated = async (supabase: SupabaseClient) => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error("Error checking authentication:", error)
      return false
    }
    return data?.session?.user?.id ? true : false
  } catch (e) {
    console.error("Exception checking authentication:", e)
    return false
  }
}

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SyncDirection = "localToRemote" | "remoteToLocal" | "merge"

export function SyncButton({ isMenuItem = false }: { isMenuItem?: boolean }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("localToRemote")
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [pendingSyncAction, setPendingSyncAction] = useState<{
    direction: SyncDirection
    conflictResolution?: "overwrite" | "merge"
  } | null>(null)

  // Update the handleSyncClick function to prevent event propagation when used as a menu item
  const handleSyncClick = (e?: React.MouseEvent) => {
    // Stop propagation if it's a menu item to prevent the dropdown from closing
    if (e && isMenuItem) {
      e.stopPropagation()
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to sync your data",
        variant: "destructive",
      })
      return
    }

    setShowDialog(true)
    setSyncStatus(null)
  }

  // Function to initiate sync with conflict checking
  const initiateSync = async (direction: SyncDirection) => {
    // For new users, add a slight delay before first sync
    const isNewUser = localStorage.getItem("streaktracker_first_sync") !== "done"

    if (isNewUser && direction === "localToRemote") {
      console.log("First sync detected, adding delay to ensure authentication is established...")
      setIsSyncing(true)
      setSyncDirection(direction)

      // Wait 2 seconds to allow auth to fully establish
      await wait(2000)

      // Mark that we've done the first sync
      localStorage.setItem("streaktracker_first_sync", "done")
    }

    if (direction === "localToRemote") {
      // For upload, we don't need conflict resolution
      handleSync(direction)
    } else {
      // For download or merge, check for potential conflicts
      setPendingSyncAction({ direction })
      setConflictDialogOpen(true)
    }
  }

  // Helper function to safely put a record in the database
  const safePut = async (table: any, record: any) => {
    try {
      await table.put(record)
      return true
    } catch (error) {
      console.error(`Error putting record in ${table.name}:`, error)
      return false
    }
  }

  const handleSync = async (direction: SyncDirection, conflictResolution?: "overwrite" | "merge", maxRetries = 3) => {
    if (!user) return

    setIsSyncing(true)
    setSyncDirection(direction)
    setSyncStatus(null)

    try {
      // Verify authentication before proceeding
      const supabase = createClientComponentClient()
      const authenticated = await isFullyAuthenticated(supabase)

      if (!authenticated) {
        // If not authenticated, wait a bit and check again
        console.log("Waiting for authentication to be fully established...")
        await wait(2000)
        const rechecked = await isFullyAuthenticated(supabase)
        if (!rechecked) {
          throw new Error("Authentication not fully established. Please try again in a moment.")
        }
      }

      const supabaseDB = getSupabaseDB(user.id)

      // Add retry logic for all sync operations
      let lastError = null
      let success = false

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (direction === "localToRemote") {
            // Sync local data to Supabase
            const localGoals = await getAllGoals()
            const localTabs = await getAllTabs()

            // Convert GoalRecord to Goal
            const goals = localGoals.map(recordToGoal)

            await supabaseDB.syncLocalToSupabase(goals, localTabs)

            success = true
            setSyncStatus({
              success: true,
              message: `Successfully synced ${goals.length} goals and ${localTabs.length} tabs to the cloud`,
            })
            break
          } else if (direction === "remoteToLocal" || direction === "merge") {
            // Get remote data
            const { goals: remoteGoals, tabs: remoteTabs } = await supabaseDB.syncSupabaseToLocal()

            // For overwrite mode, clear the database first
            if (direction === "remoteToLocal" && conflictResolution !== "merge") {
              console.log("Overwrite mode: Clearing local database")
              try {
                await db.goals.clear()
                await db.tabs.clear()
                console.log("Database cleared successfully")
              } catch (error) {
                console.error("Error clearing database:", error)
                throw error
              }
            }

            // Process the data based on the selected mode
            try {
              // Always process tabs first
              console.log(`Processing ${remoteTabs.length} tabs...`)
              for (const tab of remoteTabs) {
                try {
                  if (direction === "merge") {
                    // In merge mode, only add tabs that don't exist
                    const existingTab = await db.tabs.get(tab.id)
                    if (!existingTab) {
                      await db.tabs.put(tab)
                      console.log(`Added new tab: ${tab.id}`)
                    } else {
                      console.log(`Tab ${tab.id} already exists, skipping`)
                    }
                  } else {
                    // In overwrite mode, add all tabs
                    await db.tabs.put(tab)
                  }
                } catch (error) {
                  console.error(`Error processing tab ${tab.id}:`, error)
                  // Continue with other tabs
                }
              }

              // Then process goals
              console.log(`Processing ${remoteGoals.length} goals...`)
              let successCount = 0
              let skipCount = 0

              for (const goal of remoteGoals) {
                try {
                  // Convert Goal to GoalRecord
                  const goalRecord = {
                    id: goal.id,
                    title: goal.title,
                    startDate: goal.startDate.toISOString(),
                    endDate: goal.endDate.toISOString(),
                    progress: goal.progress,
                    color: goal.color,
                    order: goal.order,
                    notes: goal.notes,
                    tabId: goal.tabId,
                    frequency: goal.frequency,
                  }

                  if (direction === "merge") {
                    // In merge mode, only add goals that don't exist
                    const existingGoal = await db.goals.get(goal.id)
                    if (!existingGoal) {
                      await db.goals.put(goalRecord)
                      successCount++
                      console.log(`Added new goal: ${goal.id}`)
                    } else {
                      skipCount++
                      console.log(`Goal ${goal.id} already exists, skipping`)
                    }
                  } else {
                    // In overwrite mode, add all goals
                    await db.goals.put(goalRecord)
                    successCount++
                  }
                } catch (error) {
                  console.error(`Error processing goal ${goal.id}:`, error)
                  // Continue with other goals
                }
              }

              console.log(`Processed ${successCount} goals successfully, skipped ${skipCount} existing goals`)

              // If it's a merge, sync the merged data back to Supabase
              if (direction === "merge") {
                const updatedGoals = await getAllGoals()
                const updatedTabs = await getAllTabs()
                await supabaseDB.syncLocalToSupabase(updatedGoals.map(recordToGoal), updatedTabs)
              }

              setSyncStatus({
                success: true,
                message:
                  direction === "merge"
                    ? `Successfully merged data. Added ${successCount} new goals and skipped ${skipCount} existing goals.`
                    : `Successfully downloaded ${remoteGoals.length} goals and ${remoteTabs.length} tabs from the cloud`,
              })

              // Set a flag to refresh the page after the user closes the dialog
              setNeedsRefresh(true)
              success = true
              break
            } catch (error) {
              console.error("Error during data processing:", error)
              throw error
            }
          }
        } catch (error) {
          console.error(`Sync error (attempt ${attempt}/${maxRetries}):`, error)
          lastError = error

          // If it's an RLS policy error, wait and retry
          if (error.code === "42501" && attempt < maxRetries) {
            console.log(`Authentication may not be fully established. Waiting ${attempt * 1000}ms before retry...`)
            await wait(attempt * 1000)
          } else {
            // For other errors or if we've reached max retries, break the loop
            break
          }
        }
      }

      if (!success && lastError) {
        setSyncStatus({
          success: false,
          message: lastError instanceof Error ? lastError.message : "An unknown error occurred",
        })
      }
    } catch (error) {
      console.error("Sync error:", error)
      setSyncStatus({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Function to handle dialog close and refresh if needed
  const handleDialogClose = () => {
    setShowDialog(false)

    // If we need to refresh the page, do it after a short delay
    if (needsRefresh) {
      setTimeout(() => {
        window.location.reload()
      }, 300)
    }
  }

  return (
    <>
      {isMenuItem ? (
        <div className="flex items-center w-full" onClick={(e) => handleSyncClick(e)}>
          <Cloud className="mr-2 h-4 w-4" />
          <span>Sync Data</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncClick}
          disabled={!user}
          className="flex items-center gap-2"
        >
          {user ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          <span className="hidden sm:inline">Sync</span>
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sync Data</DialogTitle>
            <DialogDescription className="break-words">
              Choose how you want to sync your data between your browser and the cloud.
            </DialogDescription>
          </DialogHeader>

          {syncStatus && (
            <Alert variant={syncStatus.success ? "default" : "destructive"}>
              {syncStatus.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <div className="w-full">
                <AlertTitle>{syncStatus.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription className="break-words">{syncStatus.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {!syncStatus && !isSyncing && (
            <div className="grid gap-4 py-4">
              <Button
                onClick={() => initiateSync("localToRemote")}
                className="flex flex-col items-start justify-start gap-2 h-auto py-3 px-4 text-left w-full whitespace-normal"
                variant="outline"
              >
                <div className="flex items-center w-full">
                  <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="font-medium">Upload to Cloud</div>
                </div>
                <div className="text-xs text-muted-foreground w-full whitespace-normal break-words">
                  Replace cloud data with your browser data (deletes existing cloud data)
                </div>
              </Button>

              <Button
                onClick={() => initiateSync("remoteToLocal")}
                className="flex flex-col items-start justify-start gap-2 h-auto py-3 px-4 text-left w-full whitespace-normal"
                variant="outline"
              >
                <div className="flex items-center w-full">
                  <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="font-medium">Download from Cloud</div>
                </div>
                <div className="text-xs text-muted-foreground w-full whitespace-normal break-words">
                  Replace your browser data with cloud data
                </div>
              </Button>

              <Button
                onClick={() => initiateSync("merge")}
                className="flex flex-col items-start justify-start gap-2 h-auto py-3 px-4 text-left w-full whitespace-normal"
                variant="outline"
              >
                <div className="flex items-center w-full">
                  <Cloud className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="font-medium">Merge Data</div>
                </div>
                <div className="text-xs text-muted-foreground w-full whitespace-normal break-words">
                  Combine browser and cloud data, keeping all goals
                </div>
              </Button>
            </div>
          )}

          {isSyncing && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-center text-sm">
                {syncDirection === "localToRemote"
                  ? "Uploading your data to the cloud..."
                  : syncDirection === "remoteToLocal"
                    ? "Downloading data from the cloud..."
                    : "Merging your data..."}
              </p>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button variant="secondary" onClick={() => handleDialogClose()} disabled={isSyncing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden w-[95vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sync Conflict Resolution</DialogTitle>
            <DialogDescription className="break-words">
              Choose how to handle potential conflicts between local and cloud data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Button
              onClick={() => {
                setConflictDialogOpen(false)
                if (pendingSyncAction) {
                  handleSync(pendingSyncAction.direction, "overwrite")
                }
              }}
              className="flex flex-col items-start justify-start gap-2 h-auto py-3 px-4 text-left w-full whitespace-normal"
              variant="outline"
            >
              <div className="font-medium">Overwrite Local Data</div>
              <div className="text-xs text-muted-foreground w-full whitespace-normal break-words">
                Replace all local data with cloud data. Any local-only data will be lost.
              </div>
            </Button>

            <Button
              onClick={() => {
                setConflictDialogOpen(false)
                if (pendingSyncAction) {
                  handleSync(pendingSyncAction.direction, "merge")
                }
              }}
              className="flex flex-col items-start justify-start gap-2 h-auto py-3 px-4 text-left w-full whitespace-normal"
              variant="outline"
            >
              <div className="font-medium">Merge Data</div>
              <div className="text-xs text-muted-foreground w-full whitespace-normal break-words">
                Keep all data from both sources. This may result in duplicates if data was modified in both places.
              </div>
            </Button>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="secondary" onClick={() => setConflictDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
