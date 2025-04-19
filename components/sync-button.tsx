"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/supabase/auth-provider"
import { getSupabaseDB } from "@/lib/supabase/database"
import { getAllGoals, getAllTabs, addGoal, addTab, clearAllGoals, deleteTab } from "@/lib/db"
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
  const initiateSync = (direction: SyncDirection) => {
    if (direction === "localToRemote") {
      // For upload, we don't need conflict resolution
      handleSync(direction)
    } else {
      // For download or merge, check for potential conflicts
      setPendingSyncAction({ direction })
      setConflictDialogOpen(true)
    }
  }

  const handleSync = async (direction: SyncDirection, conflictResolution?: "overwrite" | "merge") => {
    if (!user) return

    setIsSyncing(true)
    setSyncDirection(direction)
    setSyncStatus(null)

    try {
      const supabaseDB = getSupabaseDB(user.id)

      if (direction === "localToRemote") {
        // Sync local data to Supabase (unchanged)
        const localGoals = await getAllGoals()
        const localTabs = await getAllTabs()

        // Convert GoalRecord to Goal
        const goals = localGoals.map(recordToGoal)

        await supabaseDB.syncLocalToSupabase(goals, localTabs)

        setSyncStatus({
          success: true,
          message: `Successfully synced ${goals.length} goals and ${localTabs.length} tabs to the cloud`,
        })
      } else if (direction === "remoteToLocal") {
        // Sync Supabase data to local
        const { goals, tabs } = await supabaseDB.syncSupabaseToLocal()

        // Always clear existing local data for "overwrite" mode
        // For "merge" mode, we'll handle conflicts differently
        if (conflictResolution === "overwrite" || !conflictResolution) {
          await clearAllGoals()

          // Delete all tabs except the ones we're about to add
          const existingTabs = await getAllTabs()
          for (const tab of existingTabs) {
            await deleteTab(tab.id)
          }
        }

        // Add all tabs first
        for (const tab of tabs) {
          await addTab(tab)
        }

        // Then add all goals
        for (const goal of goals) {
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

          if (conflictResolution === "merge") {
            // For merge mode, try to add, but don't fail if it exists
            try {
              await addGoal(goalRecord)
            } catch (e) {
              console.log(`Goal ${goalRecord.id} already exists, skipping`)
            }
          } else {
            // For overwrite mode, just add (we've already cleared)
            await addGoal(goalRecord)
          }
        }

        setSyncStatus({
          success: true,
          message: `Successfully synced ${goals.length} goals and ${tabs.length} tabs from the cloud`,
        })

        // Set a flag to refresh the page after the user closes the dialog
        setNeedsRefresh(true)
      } else if (direction === "merge") {
        // Merge local and remote data (mostly unchanged)
        const localGoals = await getAllGoals()
        const localTabs = await getAllTabs()
        const { goals: remoteGoals, tabs: remoteTabs } = await supabaseDB.syncSupabaseToLocal()

        // Create maps for faster lookups
        const localGoalMap = new Map(localGoals.map((g) => [g.id, g]))
        const localTabMap = new Map(localTabs.map((t) => [t.id, t]))
        const remoteGoalMap = new Map(remoteGoals.map((g) => [g.id, g]))
        const remoteTabMap = new Map(remoteTabs.map((t) => [t.id, t]))

        // Merge tabs
        const mergedTabs = [...localTabs]
        for (const remoteTab of remoteTabs) {
          if (!localTabMap.has(remoteTab.id)) {
            mergedTabs.push(remoteTab)
          }
        }

        // Clear existing tabs and add merged tabs
        for (const tab of localTabs) {
          await deleteTab(tab.id)
        }
        for (const tab of mergedTabs) {
          await addTab(tab)
        }

        // Merge goals
        const mergedGoals = [...localGoals]
        for (const remoteGoal of remoteGoals) {
          if (!localGoalMap.has(remoteGoal.id)) {
            // Convert Goal to GoalRecord
            const goalRecord = {
              id: remoteGoal.id,
              title: remoteGoal.title,
              startDate: remoteGoal.startDate.toISOString(),
              endDate: remoteGoal.endDate.toISOString(),
              progress: remoteGoal.progress,
              color: remoteGoal.color,
              order: remoteGoal.order,
              notes: remoteGoal.notes,
              tabId: remoteGoal.tabId,
              frequency: remoteGoal.frequency,
            }
            mergedGoals.push(goalRecord)
          }
        }

        // Clear existing goals and add merged goals
        await clearAllGoals()
        for (const goal of mergedGoals) {
          await addGoal(goal)
        }

        // Sync merged data back to Supabase
        await supabaseDB.syncLocalToSupabase(mergedGoals.map(recordToGoal), mergedTabs)

        setSyncStatus({
          success: true,
          message: `Successfully merged ${mergedGoals.length} goals and ${mergedTabs.length} tabs`,
        })

        // Set a flag to refresh the page after the user closes the dialog
        setNeedsRefresh(true)
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
                  Send your browser data to the cloud storage
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
