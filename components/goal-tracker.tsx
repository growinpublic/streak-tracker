"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { GoalForm } from "./goal-form"
import { StreakBar } from "./streak-bar"
import { Button } from "@/components/ui/button"
import {
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  XCircle,
  CheckCircle,
  ChevronRight,
  Edit,
  Save,
  X,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react"
import {
  type GoalRecord,
  getAllGoals,
  addGoal as dbAddGoal,
  deleteGoal as dbDeleteGoal,
  updateGoalProgress,
  updateGoalOrder,
  updateGoal as dbUpdateGoal,
  updateGoalNote,
} from "@/lib/db"
import { LoadingSpinner } from "./loading-spinner"
import { ImportExport } from "./import-export"
import { differenceInDays, addDays, format } from "date-fns"
import { MobileDialog } from "./mobile-dialog"
import { NoteDialog } from "./note-dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CustomDropdown } from "./custom-dropdown"
import { GoalCelebration } from "./goal-celebration"
import { AchievementPopup } from "./achievement-popup"

export interface Goal {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: string[] // Array of dates marked as completed (ISO strings)
  color: string
  order: number
  notes: Record<string, string> // Map of date strings to notes
}

function recordToGoal(record: GoalRecord): Goal {
  return {
    ...record,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    order: record.order || 0, // Default to 0 if order is not set
    notes: record.notes || {}, // Default to empty object if notes is not set
  }
}

function goalToRecord(goal: Goal): GoalRecord {
  return {
    ...goal,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    order: goal.order || 0, // Default to 0 if order is not set
    notes: goal.notes || {}, // Default to empty object if notes is not set
  }
}

export function GoalTracker() {
  const [showForm, setShowForm] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // State for collapsible goals
  const [collapsedGoals, setCollapsedGoals] = useState<Record<string, boolean>>({})

  // State for editable titles
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState("")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // State for the extend end date confirmation dialog
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [extendInfo, setExtendInfo] = useState<{ goalId: string; newEndDate: string } | null>(null)

  // State for the note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteInfo, setNoteInfo] = useState<{ goalId: string; date: string; initialNote: string } | null>(null)

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)

  // State for celebration animation
  const [celebrationVisible, setCelebrationVisible] = useState(false)
  const [celebrationColor, setCelebrationColor] = useState("")
  const [celebrationRect, setCelebrationRect] = useState<DOMRect | null>(null)

  // State for achievement popup
  const [achievementPopupVisible, setAchievementPopupVisible] = useState(false)
  const [achievedGoalTitle, setAchievedGoalTitle] = useState("")

  // Refs for goal elements
  const goalRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Load goals from database
  const loadGoals = async () => {
    try {
      setLoading(true)
      const records = await getAllGoals()
      const loadedGoals = records.map(recordToGoal)

      // Sort goals by order
      loadedGoals.sort((a, b) => a.order - b.order)

      setGoals(loadedGoals)
    } catch (error) {
      console.error("Failed to load goals:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load goals on component mount
  useEffect(() => {
    loadGoals()
  }, [])

  // Focus the title input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [editingTitle])

  const addGoal = async (goal: Omit<Goal, "id" | "progress" | "order" | "notes">) => {
    try {
      // Get the highest order value
      const highestOrder = goals.length > 0 ? Math.max(...goals.map((g) => g.order)) : -1

      const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
        progress: [],
        order: highestOrder + 1, // Place new goal at the end
        notes: {}, // Initialize with empty notes
      }

      await dbAddGoal(goalToRecord(newGoal))

      // Update local state
      setGoals((prev) => [...prev, newGoal])
      setShowForm(false)
    } catch (error) {
      console.error("Failed to add goal:", error)
    }
  }

  // Check if a goal is completed
  const isGoalCompleted = (goal: Goal) => {
    // Normalize dates for comparison
    const start = new Date(goal.startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(goal.endDate)
    end.setHours(0, 0, 0, 0)

    // Calculate total days in the goal range (inclusive)
    const totalDays = differenceInDays(end, start) + 1

    // Count only progress dates that are within the goal range
    const validProgressDates = goal.progress.filter((dateStr) => {
      const date = new Date(dateStr)
      date.setHours(0, 0, 0, 0)
      return date >= start && date <= end
    })

    // Goal is completed when all days are marked as completed
    return validProgressDates.length >= totalDays
  }

  // Check if a goal was just completed with this update
  const checkGoalCompletion = (goalId: string, newProgress: string[]) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return false

    // Create a copy of the goal with the new progress
    const updatedGoal = { ...goal, progress: newProgress }

    // Check if the goal wasn't completed before but is now
    const wasCompletedBefore = isGoalCompleted(goal)
    const isCompletedNow = isGoalCompleted(updatedGoal)

    return !wasCompletedBefore && isCompletedNow
  }

  const updateProgress = async (goalId: string, date: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      // Check if the date is already in progress
      const isAlreadyCompleted = goal.progress.includes(date)

      if (isAlreadyCompleted) {
        // If already completed, just remove it
        const newProgress = goal.progress.filter((d) => d !== date)
        await updateGoalProgress(goalId, newProgress)

        // Update local state
        setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)))
      } else {
        // If not completed, add it and show the note dialog
        const newProgress = [...goal.progress, date]

        // Check if this update completes the goal
        const justCompleted = checkGoalCompletion(goalId, newProgress)

        await updateGoalProgress(goalId, newProgress)

        // Update local state
        setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)))

        // If the goal was just completed, trigger celebration
        if (justCompleted) {
          const goalElement = goalRefs.current[goalId]
          if (goalElement) {
            setCelebrationColor(goal.color)
            setCelebrationRect(goalElement.getBoundingClientRect())
            setCelebrationVisible(true)
            setAchievedGoalTitle(goal.title)
            setAchievementPopupVisible(true)
          }
        }

        // Open note dialog
        setNoteInfo({
          goalId,
          date,
          initialNote: goal.notes[date] || "",
        })
        setNoteDialogOpen(true)
      }
    } catch (error) {
      console.error("Failed to update progress:", error)
    }
  }

  const saveNote = async (note: string) => {
    if (!noteInfo) return

    try {
      const { goalId, date } = noteInfo

      // Save note to database
      await updateGoalNote(goalId, date, note)

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, notes: { ...g.notes, [date]: note } } : g)))
    } catch (error) {
      console.error("Failed to save note:", error)
    }
  }

  // Show delete confirmation dialog
  const confirmDeleteGoal = (goalId: string) => {
    setDeleteGoalId(goalId)
    setDeleteDialogOpen(true)
  }

  // Delete goal after confirmation
  const deleteGoal = async () => {
    if (!deleteGoalId) return

    try {
      await dbDeleteGoal(deleteGoalId)

      // Update local state
      setGoals((prev) => prev.filter((g) => g.id !== deleteGoalId))

      // Remove from collapsed state if present
      if (collapsedGoals[deleteGoalId]) {
        const newCollapsedGoals = { ...collapsedGoals }
        delete newCollapsedGoals[deleteGoalId]
        setCollapsedGoals(newCollapsedGoals)
      }

      // Reset state
      setDeleteGoalId(null)
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete goal:", error)
    }
  }

  // New function to clear all progress for a goal
  const clearProgress = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      // Clear all progress
      await updateGoalProgress(goalId, [])

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, progress: [] } : g)))
    } catch (error) {
      console.error("Failed to clear progress:", error)
    }
  }

  // New function to fill all dates in the goal range
  const fillProgress = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      // Generate all dates in the range
      const startDate = new Date(goal.startDate)
      const endDate = new Date(goal.endDate)

      // Calculate total days in the goal range (inclusive)
      const totalDays = differenceInDays(endDate, startDate) + 1

      // Generate array of all dates in the range
      const allDates: string[] = []
      for (let i = 0; i < totalDays; i++) {
        const date = addDays(startDate, i)
        allDates.push(format(date, "yyyy-MM-dd"))
      }

      // Check if this update completes the goal
      const justCompleted = checkGoalCompletion(goalId, allDates)

      // Update progress with all dates
      await updateGoalProgress(goalId, allDates)

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, progress: allDates } : g)))

      // If the goal was just completed, trigger celebration
      if (justCompleted) {
        const goalElement = goalRefs.current[goalId]
        if (goalElement) {
          setCelebrationColor(goal.color)
          setCelebrationRect(goalElement.getBoundingClientRect())
          setCelebrationVisible(true)
          setAchievedGoalTitle(goal.title)
          setAchievementPopupVisible(true)
        }
      }
    } catch (error) {
      console.error("Failed to fill progress:", error)
    }
  }

  // Function to handle extending the end date
  const handleExtendEndDate = (goalId: string, dateStr: string) => {
    setExtendInfo({ goalId, newEndDate: dateStr })
    setExtendDialogOpen(true)
  }

  // Function to confirm and extend the end date
  const confirmExtendEndDate = async () => {
    if (!extendInfo) return

    try {
      const { goalId, newEndDate } = extendInfo
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      // Create updated goal with new end date
      const updatedGoal = {
        ...goal,
        endDate: new Date(newEndDate),
      }

      // Update in database
      await dbUpdateGoal(goalToRecord(updatedGoal))

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)))

      // Close dialog
      setExtendDialogOpen(false)
      setExtendInfo(null)
    } catch (error) {
      console.error("Failed to extend end date:", error)
    }
  }

  // New function to move a goal up or down
  const moveGoal = async (goalId: string, direction: "up" | "down") => {
    try {
      // Find the current goal and its index
      const currentIndex = goals.findIndex((g) => g.id === goalId)
      if (currentIndex === -1) return

      // Calculate the target index
      const targetIndex =
        direction === "up" ? Math.max(0, currentIndex - 1) : Math.min(goals.length - 1, currentIndex + 1)

      // If already at the top/bottom, do nothing
      if (targetIndex === currentIndex) return

      // Create a copy of the goals array for reordering
      const updatedGoals = [...goals]

      // Swap the goals
      const temp = updatedGoals[currentIndex]
      updatedGoals[currentIndex] = updatedGoals[targetIndex]
      updatedGoals[targetIndex] = temp

      // Update the order property for all goals
      const reorderedGoals = updatedGoals.map((goal, index) => ({
        ...goal,
        order: index,
      }))

      // Update the database
      for (const goal of reorderedGoals) {
        await updateGoalOrder(goal.id, goal.order)
      }

      // Update the state
      setGoals(reorderedGoals)
    } catch (error) {
      console.error("Failed to reorder goals:", error)
    }
  }

  // Function to view notes for a specific date
  const viewNotes = (goalId: string, date: string) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return

    setNoteInfo({
      goalId,
      date,
      initialNote: goal.notes[date] || "",
    })
    setNoteDialogOpen(true)
  }

  // Function to toggle collapse state for a goal
  const toggleCollapse = (goalId: string) => {
    setCollapsedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }))
  }

  // Function to collapse all goals
  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {}
    goals.forEach((goal) => {
      allCollapsed[goal.id] = true
    })
    setCollapsedGoals(allCollapsed)
  }

  // Function to expand all goals
  const expandAll = () => {
    setCollapsedGoals({})
  }

  // Function to start editing a goal title
  const startEditingTitle = (goalId: string, currentTitle: string) => {
    setEditingTitle(goalId)
    setEditTitleValue(currentTitle)
  }

  // Function to save edited title
  const saveEditedTitle = async (goalId: string) => {
    try {
      if (!editTitleValue.trim()) {
        // Don't save empty titles
        cancelEditingTitle()
        return
      }

      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return

      const updatedGoal = {
        ...goal,
        title: editTitleValue.trim(),
      }

      // Update in database
      await dbUpdateGoal(goalToRecord(updatedGoal))

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)))

      // Exit edit mode
      setEditingTitle(null)
    } catch (error) {
      console.error("Failed to update goal title:", error)
    }
  }

  // Function to cancel title editing
  const cancelEditingTitle = () => {
    setEditingTitle(null)
    setEditTitleValue("")
  }

  // Handle key press in title input
  const handleTitleKeyDown = (e: React.KeyboardEvent, goalId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEditedTitle(goalId)
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEditingTitle()
    }
  }

  // Handle celebration completion
  const handleCelebrationComplete = () => {
    setCelebrationVisible(false)
    setCelebrationRect(null)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-medium">Your Goals</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={collapseAll} title="Collapse all goals">
            <ChevronsUp className="h-4 w-4 mr-2" />
            Collapse All
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll} title="Expand all goals">
            <ChevronsDown className="h-4 w-4 mr-2" />
            Expand All
          </Button>
          <Separator orientation="vertical" className="h-8 hidden sm:block" />
          <ImportExport onImportComplete={loadGoals} />
        </div>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="space-y-3 p-4 border rounded-lg border-border overflow-hidden"
              ref={(el) => (goalRefs.current[goal.id] = el)}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => toggleCollapse(goal.id)}
                    aria-label={collapsedGoals[goal.id] ? "Expand goal" : "Collapse goal"}
                  >
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${collapsedGoals[goal.id] ? "" : "rotate-90"}`}
                    />
                  </Button>

                  <div className="goal-title-dot" style={{ backgroundColor: goal.color }} />

                  <div className="space-y-1 min-w-0 flex-1 max-w-full">
                    <div className="flex items-center gap-2 max-w-full">
                      {editingTitle === goal.id ? (
                        <div className="flex items-center gap-1 w-full">
                          <Input
                            ref={titleInputRef}
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => handleTitleKeyDown(e, goal.id)}
                            className="h-8 py-1 text-xl font-medium"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => saveEditedTitle(goal.id)}
                            aria-label="Save title"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={cancelEditingTitle}
                            aria-label="Cancel editing"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 goal-title-container min-w-0 w-full">
                          <h3 className="text-xl font-medium truncate">{goal.title}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 edit-title-button flex-shrink-0"
                            onClick={() => startEditingTitle(goal.id, goal.title)}
                            aria-label="Edit title"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {!collapsedGoals[goal.id] && (
                      <div className="text-sm text-muted-foreground">
                        {new Date(goal.startDate).toLocaleDateString()} to {new Date(goal.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveGoal(goal.id, "up")}
                      disabled={goals.indexOf(goal) === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveGoal(goal.id, "down")}
                      disabled={goals.indexOf(goal) === goals.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {!collapsedGoals[goal.id] && (
                    <CustomDropdown
                      items={[
                        {
                          label: "Clear Progress",
                          icon: <XCircle className="h-4 w-4" />,
                          onClick: () => clearProgress(goal.id),
                        },
                        {
                          label: "Fill All Dates",
                          icon: <CheckCircle className="h-4 w-4" />,
                          onClick: () => fillProgress(goal.id),
                        },
                        {
                          label: "Delete Goal",
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => confirmDeleteGoal(goal.id),
                          className: "text-destructive",
                        },
                      ]}
                    />
                  )}
                </div>
              </div>

              {!collapsedGoals[goal.id] && (
                <StreakBar
                  startDate={goal.startDate}
                  endDate={goal.endDate}
                  progress={goal.progress}
                  color={goal.color}
                  notes={goal.notes}
                  onDateClick={(date) => updateProgress(goal.id, date)}
                  onExtendEndDate={(date) => handleExtendEndDate(goal.id, date)}
                  onViewNotes={(date) => viewNotes(goal.id, date)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg border-border">
          <p className="text-muted-foreground mb-4">No goals added yet. Add your first goal to get started!</p>
        </div>
      )}

      {showForm ? (
        <GoalForm onSubmit={addGoal} onCancel={() => setShowForm(false)} />
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Goal
        </Button>
      )}

      {/* Custom Mobile Dialog for Extending End Date */}
      <MobileDialog
        isOpen={extendDialogOpen}
        onClose={() => setExtendDialogOpen(false)}
        title="Extend Goal End Date"
        description={`Do you want to extend this goal's end date to ${
          extendInfo?.newEndDate ? new Date(extendInfo.newEndDate).toLocaleDateString() : ""
        }?`}
        onConfirm={confirmExtendEndDate}
        confirmText="Extend End Date"
        cancelText="Cancel"
      />

      {/* Note Dialog */}
      <NoteDialog
        isOpen={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        date={noteInfo?.date || ""}
        initialNote={noteInfo?.initialNote || ""}
        onSave={saveNote}
        title="Add Note"
      />

      {/* Delete Confirmation Dialog */}
      <MobileDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        onConfirm={deleteGoal}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Goal Celebration Animation */}
      <GoalCelebration
        isVisible={celebrationVisible}
        color={celebrationColor}
        sourceRect={celebrationRect}
        onComplete={handleCelebrationComplete}
      />

      {/* Achievement Popup */}
      <AchievementPopup
        isVisible={achievementPopupVisible}
        goalTitle={achievedGoalTitle}
        onClose={() => setAchievementPopupVisible(false)}
      />
    </div>
  )
}
