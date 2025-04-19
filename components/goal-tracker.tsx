"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { GoalForm } from "./goal-form"
import { StreakBar } from "./streak-bar"
import { Button } from "@/components/ui/button"
import {
  PlusCircle,
  Trash2,
  XCircle,
  CheckCircle,
  ChevronRight,
  Edit,
  Save,
  X,
  ChevronsUp,
  ChevronsDown,
  Share2,
} from "lucide-react"
import {
  type GoalRecord,
  type TabRecord,
  getAllGoals,
  getAllTabs,
  addGoal as dbAddGoal,
  addTab as dbAddTab,
  deleteGoal as dbDeleteGoal,
  updateGoalProgress,
  updateGoal as dbUpdateGoal,
  updateGoalNote,
  deleteTabAndMoveGoals,
} from "@/lib/db"
import { LoadingSpinner } from "./loading-spinner"
import { ImportExport } from "./import-export"
import { differenceInDays, addDays, format, isWithinInterval } from "date-fns"
import { MobileDialog } from "./mobile-dialog"
import { NoteDialog } from "./note-dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CustomDropdown } from "./custom-dropdown"
import { GoalCelebration } from "./goal-celebration"
import { AchievementPopup } from "./achievement-popup"
import { TabNavigation } from "./tab-navigation"
import { GoalReorderButtons } from "./goal-reorder-buttons"
import { cn } from "@/lib/utils"

// Update the Goal interface to include frequency
export interface Goal {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: string[] // Array of dates marked as completed (ISO strings)
  color: string
  order: number
  notes: Record<string, string> // Map of date strings to notes
  tabId: string // Tab this goal belongs to
  frequency?: {
    count: number // How many times
    period: "day" | "week" | "month" // Per what period
  }
}

// Also update the recordToGoal function to handle frequency
export function recordToGoal(record: GoalRecord): Goal {
  return {
    ...record,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    order: record.order || 0, // Default to 0 if order is not set
    notes: record.notes || {}, // Default to empty object if notes is not set
    tabId: record.tabId || "", // Default to empty string if tabId is not set
    frequency: record.frequency || undefined, // Add frequency field
  }
}

// Update the goalToRecord function to handle frequency
function goalToRecord(goal: Goal): GoalRecord {
  return {
    ...goal,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    order: goal.order || 0, // Default to 0 if order is not set
    notes: goal.notes || {}, // Default to empty object if notes is not set
    tabId: goal.tabId || "", // Default to empty string if tabId is not set
    frequency: goal.frequency || undefined, // Add frequency field
  }
}

export function GoalTracker() {
  const [showForm, setShowForm] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [tabs, setTabs] = useState<TabRecord[]>([])
  const [activeTabId, setActiveTabId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isMoving, setIsMoving] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareText, setShareText] = useState("")

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

  // State for tab deletion confirmation
  const [deleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false)
  const [deleteTabInfo, setDeleteTabInfo] = useState<{ tabId: string; tabName: string } | null>(null)

  // State for celebration animation
  const [celebrationVisible, setCelebrationVisible] = useState(false)
  const [celebrationColor, setCelebrationColor] = useState("")
  const [celebrationRect, setCelebrationRect] = useState<DOMRect | null>(null)
  const [isFrequencyGoal, setIsFrequencyGoal] = useState(false)

  // State for achievement popup
  const [achievementPopupVisible, setAchievementPopupVisible] = useState(false)
  const [achievedGoalTitle, setAchievedGoalTitle] = useState("")
  const [frequencyText, setFrequencyText] = useState("")

  // Refs for goal elements
  const goalRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Load tabs and goals from database
  const loadData = async () => {
    try {
      setLoading(true)

      // Load tabs first
      let tabRecords = await getAllTabs()
      console.log("Loaded tabs:", tabRecords)

      // Create a default tab if none exist
      if (tabRecords.length === 0) {
        console.log("No tabs found, creating default tab")
        const defaultTabId = crypto.randomUUID()
        const defaultTab = {
          id: defaultTabId,
          name: "Tab1",
          order: 0,
        }

        await dbAddTab(defaultTab)
        tabRecords = [defaultTab]
      }

      // Sort tabs by order
      tabRecords.sort((a, b) => a.order - b.order)
      setTabs(tabRecords)

      // Set active tab to the first tab if not already set
      if (!activeTabId && tabRecords.length > 0) {
        setActiveTabId(tabRecords[0].id)
      }

      // Load all goals
      const goalRecords = await getAllGoals()
      console.log("Loaded goals:", goalRecords)

      // If any goals don't have a tabId, assign them to the first tab
      const goalsToUpdate = []
      for (const goal of goalRecords) {
        if (!goal.tabId && tabRecords.length > 0) {
          goal.tabId = tabRecords[0].id
          goalsToUpdate.push(goal)
        }
      }

      // Update goals with missing tabId
      for (const goal of goalsToUpdate) {
        await dbUpdateGoal(goal)
      }

      const loadedGoals = goalRecords.map(recordToGoal)

      // Sort goals by order
      loadedGoals.sort((a, b) => a.order - b.order)
      setGoals(loadedGoals)

      // Initialize all goals as collapsed by default
      if (loadedGoals.length > 0) {
        const allCollapsed: Record<string, boolean> = {}
        loadedGoals.forEach((goal) => {
          allCollapsed[goal.id] = true
        })
        setCollapsedGoals(allCollapsed)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Focus the title input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [editingTitle])

  // Add a new tab
  const addTab = async () => {
    try {
      // Get the highest order value
      const highestOrder = tabs.length > 0 ? Math.max(...tabs.map((t) => t.order)) : -1

      // Generate a new tab number
      const tabNumber = tabs.length + 1

      const newTab: TabRecord = {
        id: crypto.randomUUID(),
        name: `Tab${tabNumber}`,
        order: highestOrder + 1,
      }

      await dbAddTab(newTab)
      console.log("Added new tab:", newTab)

      // Update local state
      setTabs((prev) => [...prev, newTab])

      // Switch to the new tab
      setActiveTabId(newTab.id)
    } catch (error) {
      console.error("Failed to add tab:", error)
    }
  }

  // Delete a tab
  const confirmDeleteTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    // Find another tab to move goals to
    const otherTab = tabs.find((t) => t.id !== tabId)
    if (!otherTab) {
      // Can't delete the last tab
      return
    }

    setDeleteTabInfo({ tabId, tabName: tab.name })
    setDeleteTabDialogOpen(true)
  }

  // Delete tab after confirmation
  const deleteTab = async () => {
    if (!deleteTabInfo) return

    try {
      const { tabId } = deleteTabInfo

      // Find another tab to move goals to and switch to
      const otherTab = tabs.find((t) => t.id !== tabId)
      if (!otherTab) return

      // Delete tab and move its goals to the other tab
      await deleteTabAndMoveGoals(tabId, otherTab.id)
      console.log(`Deleted tab ${tabId} and moved goals to ${otherTab.id}`)

      // Update local state
      setTabs((prev) => prev.filter((t) => t.id !== tabId))
      setGoals((prev) => prev.map((g) => (g.tabId === tabId ? { ...g, tabId: otherTab.id } : g)))

      // Switch to the other tab
      setActiveTabId(otherTab.id)

      // Reset state
      setDeleteTabInfo(null)
      setDeleteTabDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete tab:", error)
    }
  }

  // Update tab name
  const updateTabName = async (tabId: string, newName: string) => {
    try {
      // Update local state immediately for better UX
      setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)))

      console.log(`Tab ${tabId} renamed to ${newName} in UI`)
    } catch (error) {
      console.error("Failed to update tab name in UI:", error)
    }
  }

  // Add a new goal
  const addGoal = async (goal: Omit<Goal, "id" | "progress" | "order" | "notes" | "tabId">) => {
    try {
      // Get all goals in the active tab
      const tabGoals = goals.filter((g) => g.tabId === activeTabId)

      // Find the lowest order value and subtract 10 to place the new goal at the top
      const lowestOrder = tabGoals.length > 0 ? Math.min(...tabGoals.map((g) => g.order)) : 0
      const newOrder = lowestOrder - 10 // Place new goal at the top with a lower order value

      const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
        progress: [],
        order: newOrder,
        notes: {}, // Initialize with empty notes
        tabId: activeTabId, // Automatically assign to active tab
      }

      await dbAddGoal(goalToRecord(newGoal))
      console.log("Added new goal:", newGoal)

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

    // If using frequency, check against required completions
    if (goal.frequency) {
      const { count, period } = goal.frequency
      let requiredCompletions = 0

      if (period === "day") {
        requiredCompletions = count * totalDays
      } else if (period === "week") {
        // More accurate calculation for weeks
        const exactWeeks = totalDays / 7
        requiredCompletions = Math.round(count * exactWeeks)
      } else if (period === "month") {
        const exactMonths = totalDays / 30
        requiredCompletions = Math.round(count * exactMonths)
      }

      return validProgressDates.length >= requiredCompletions
    }

    // Standard completion check for daily goals
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

  // Format frequency text for achievement popup
  const getFrequencyText = (goal: Goal) => {
    if (!goal.frequency) return ""

    const { count, period } = goal.frequency
    const totalDays = differenceInDays(goal.endDate, goal.startDate) + 1

    let periodText = ""
    if (period === "day") {
      periodText = `${count} per day`
    } else if (period === "week") {
      const exactWeeks = totalDays / 7
      periodText = `${count} per week for ${Math.round(exactWeeks * 10) / 10} weeks`
    } else if (period === "month") {
      const exactMonths = totalDays / 30
      periodText = `${count} per month for ${Math.round(exactMonths * 10) / 10} months`
    }

    return `You've completed your goal of ${periodText}!`
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

            // Set frequency-specific celebration properties
            setIsFrequencyGoal(!!goal.frequency)
            if (goal.frequency) {
              setFrequencyText(getFrequencyText(goal))
            } else {
              setFrequencyText("")
            }

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

          // Set frequency-specific celebration properties
          setIsFrequencyGoal(!!goal.frequency)
          if (goal.frequency) {
            setFrequencyText(getFrequencyText(goal))
          } else {
            setFrequencyText("")
          }

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
    setIsFrequencyGoal(false)
  }

  // Count valid progress days for a goal (only those within the goal range)
  const countValidProgressDays = (goal: Goal) => {
    // Normalize dates for comparison
    const start = new Date(goal.startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(goal.endDate)
    end.setHours(0, 0, 0, 0)

    // Count only progress dates that are within the goal range
    return goal.progress.filter((dateStr) => {
      const date = new Date(dateStr)
      date.setHours(0, 0, 0, 0)
      return isWithinInterval(date, { start, end })
    }).length
  }

  // Calculate total days in a goal
  const calculateTotalDays = (goal: Goal) => {
    return differenceInDays(new Date(goal.endDate), new Date(goal.startDate)) + 1
  }

  // Generate share text for today's summary
  const generateShareText = () => {
    const today = new Date()

    // Format today's date
    const formattedDate = format(today, "MMMM d, yyyy")

    // Start with header
    let text = `📊 Streak - ${formattedDate}\n\n`

    // Sort goals by completion percentage (descending)
    const sortedGoals = [...goals].sort((a, b) => {
      const aProgress = countValidProgressDays(a) / calculateTotalDays(a)
      const bProgress = countValidProgressDays(b) / calculateTotalDays(b)
      return bProgress - aProgress
    })

    // Add each goal with the exact format requested
    sortedGoals.forEach((goal) => {
      const completedDays = countValidProgressDays(goal)

      // Add frequency info if available
      const frequencyInfo = goal.frequency ? ` (${goal.frequency.count}/${goal.frequency.period})` : ""

      text += `☑️ Day ${completedDays}${frequencyInfo}: ${goal.title}\n`
    })

    return text
  }

  // Share summary on social media
  const shareGoalSummary = () => {
    const text = generateShareText()
    setShareText(text)

    // Check if Web Share API is available
    if (navigator.share) {
      navigator
        .share({
          title: "My Streak Tracker Summary",
          text: text,
        })
        .catch((error) => {
          console.log("Error sharing:", error)
          // Fallback to dialog if sharing fails
          setShareDialogOpen(true)
        })
    } else {
      // Fallback for browsers that don't support Web Share API
      setShareDialogOpen(true)
    }
  }

  // Share to Twitter/X
  const shareToTwitter = () => {
    const encodedText = encodeURIComponent(shareText)
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank")
    setShareDialogOpen(false)
  }

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        alert("Summary copied to clipboard!")
        setShareDialogOpen(false)
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err)
      })
  }

  // COMPLETELY REWRITTEN REORDERING FUNCTIONS
  // Move a goal up in the order
  const moveGoalUp = async (goalId: string) => {
    if (isMoving) return // Prevent multiple simultaneous reordering operations

    try {
      setIsMoving(true)
      console.log("Moving goal up:", goalId)

      // Get all goals in the current tab
      const tabGoals = [...goals.filter((g) => g.tabId === activeTabId)]
      tabGoals.sort((a, b) => a.order - b.order)

      // Find the current goal's index
      const currentIndex = tabGoals.findIndex((g) => g.id === goalId)
      if (currentIndex <= 0) {
        console.log("Already at the top, can't move up")
        return // Already at the top
      }

      // Swap positions in the array
      const newOrder = [...tabGoals]
      const temp = newOrder[currentIndex]
      newOrder[currentIndex] = newOrder[currentIndex - 1]
      newOrder[currentIndex - 1] = temp

      // Reassign all orders sequentially to avoid any order conflicts
      const updatedGoals = newOrder.map((goal, index) => ({
        ...goal,
        order: index * 10, // Use multiples of 10 to leave room between values
      }))

      console.log("New goal order:", updatedGoals.map((g) => `${g.title}: ${g.order}`).join(", "))

      // Update all goals in the database in sequence
      const updatePromises = []
      for (const goal of updatedGoals) {
        updatePromises.push(dbUpdateGoal(goalToRecord(goal)))
      }

      // Wait for all
      await Promise.all(updatePromises)
        .then(() => {
          console.log("Database updates completed")
        })
        .catch((error) => {
          console.error("Error updating goals in database:", error)
        })

      // Only update the UI state after all database operations succeed
      setGoals((prevGoals) => {
        // Remove all goals from this tab
        const otherTabGoals = prevGoals.filter((g) => g.tabId !== activeTabId)
        // Add back the updated goals
        return [...otherTabGoals, ...updatedGoals]
      })

      console.log("UI state updated")
    } catch (error) {
      console.error("Failed to move goal up:", error)
      // Reload data from database to ensure UI is in sync
      loadData()
    } finally {
      setTimeout(() => {
        setIsMoving(false)
        console.log("Move operation completed")
      }, 500) // Add a small delay before allowing new operations
    }
  }

  // Move a goal down in the order
  const moveGoalDown = async (goalId: string) => {
    if (isMoving) return // Prevent multiple simultaneous reordering operations

    try {
      setIsMoving(true)
      console.log("Moving goal down:", goalId)

      // Get all goals in the current tab
      const tabGoals = [...goals.filter((g) => g.tabId === activeTabId)]
      tabGoals.sort((a, b) => a.order - b.order)

      // Find the current goal's index
      const currentIndex = tabGoals.findIndex((g) => g.id === goalId)
      if (currentIndex < 0 || currentIndex >= tabGoals.length - 1) {
        console.log("Already at the bottom, can't move down")
        return // Already at the bottom or not found
      }

      // Swap positions in the array
      const newOrder = [...tabGoals]
      const temp = newOrder[currentIndex]
      newOrder[currentIndex] = newOrder[currentIndex + 1]
      newOrder[currentIndex + 1] = temp

      // Reassign all orders sequentially to avoid any order conflicts
      const updatedGoals = newOrder.map((goal, index) => ({
        ...goal,
        order: index * 10, // Use multiples of 10 to leave room between values
      }))

      console.log("New goal order:", updatedGoals.map((g) => `${g.title}: ${g.order}`).join(", "))

      // Update all goals in the database in sequence
      const updatePromises = []
      for (const goal of updatedGoals) {
        updatePromises.push(dbUpdateGoal(goalToRecord(goal)))
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises)
        .then(() => {
          console.log("Database updates completed")
        })
        .catch((error) => {
          console.error("Error updating goals in database:", error)
        })

      // Only update the UI state after all database operations succeed
      setGoals((prevGoals) => {
        // Remove all goals from this tab
        const otherTabGoals = prevGoals.filter((g) => g.tabId !== activeTabId)
        // Add back the updated goals
        return [...otherTabGoals, ...updatedGoals]
      })

      console.log("UI state updated")
    } catch (error) {
      console.error("Failed to move goal down:", error)
      // Reload data from database to ensure UI is in sync
      loadData()
    } finally {
      setTimeout(() => {
        setIsMoving(false)
        console.log("Move operation completed")
      }, 500) // Add a small delay before allowing new operations
    }
  }

  // Get goals for the active tab
  const activeTabGoals = goals.filter((goal) => goal.tabId === activeTabId)

  // Sort goals by order
  activeTabGoals.sort((a, b) => a.order - b.order)

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Fixed header section with tabs and controls */}
      <div className="flex-none">
        {/* Tab Navigation - now at the very top */}
        {tabs.length > 0 && (
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onAddTab={addTab}
            onDeleteTab={confirmDeleteTab}
            onTabRename={(tabId, newName) => {
              // Update the tabs in the local state
              setTabs((prevTabs) => prevTabs.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)))
            }}
          />
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
          <div className="relative w-full sm:w-auto">
            {/* Swipeable button container */}
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 sm:pb-0 snap-x snap-mandatory swipe-hint sm:swipe-hint-none"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <div className="flex gap-2 min-w-max">
                <Button
                  onClick={() => setShowForm(!showForm)}
                  variant={showForm ? "secondary" : "default"}
                  size="sm"
                  className="snap-start whitespace-nowrap"
                >
                  <PlusCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{showForm ? "Cancel" : "Add New Goal"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  title="Collapse all goals"
                  className="snap-start whitespace-nowrap"
                >
                  <ChevronsUp className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Collapse All</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  title="Expand all goals"
                  className="snap-start whitespace-nowrap"
                >
                  <ChevronsDown className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Expand All</span>
                </Button>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <div className="snap-start">
                  <ImportExport onImportComplete={loadData} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareGoalSummary}
                  title="Share summary"
                  className="snap-start whitespace-nowrap"
                >
                  <Share2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </div>
            </div>

            {/* Scroll indicator for mobile */}
            <div className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent sm:hidden"></div>
          </div>
        </div>

        {/* Goal form now appears at the top */}
        {showForm && (
          <div className="mb-3 sm:mb-4">
            <GoalForm onSubmit={addGoal} onCancel={() => setShowForm(false)} />
          </div>
        )}
      </div>

      {/* Scrollable content area for goals */}
      <div className="flex-grow overflow-y-auto pr-4 pt-4">
        {activeTabGoals.length > 0 ? (
          <div className="space-y-4 sm:space-y-6 pb-6">
            {activeTabGoals.map((goal, index) => (
              <div
                key={goal.id}
                className={cn(
                  "space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg border-border overflow-hidden",
                  isGoalCompleted(goal) && goal.frequency && "frequency-completed",
                )}
                ref={(el) => (goalRefs.current[goal.id] = el)}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Collapse button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                    onClick={() => toggleCollapse(goal.id)}
                    aria-label={collapsedGoals[goal.id] ? "Expand goal" : "Collapse goal"}
                  >
                    <ChevronRight
                      className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${collapsedGoals[goal.id] ? "" : "rotate-90"}`}
                    />
                  </Button>

                  {/* Color dot */}
                  <div className="goal-title-dot" style={{ backgroundColor: goal.color }} />

                  {/* Title section */}
                  <div className="min-w-0 flex-1">
                    {editingTitle === goal.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={titleInputRef}
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => handleTitleKeyDown(e, goal.id)}
                          className="h-7 sm:h-8 py-1 text-sm sm:text-base md:text-xl font-medium"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                          onClick={() => saveEditedTitle(goal.id)}
                          aria-label="Save title"
                        >
                          <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                          onClick={cancelEditingTitle}
                          aria-label="Cancel editing"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 goal-title-container">
                          <h3
                            className={cn(
                              "font-medium truncate",
                              "text-sm sm:text-base md:text-xl", // Smaller on mobile, larger on desktop
                            )}
                          >
                            {goal.title}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 edit-title-button flex-shrink-0"
                            onClick={() => startEditingTitle(goal.id, goal.title)}
                            aria-label="Edit title"
                          >
                            <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        </div>

                        {/* Display frequency if set */}
                        {goal.frequency && (
                          <div className="text-xs text-muted-foreground">
                            {goal.frequency.count} time{goal.frequency.count !== 1 ? "s" : ""} per{" "}
                            {goal.frequency.period}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Removed the goal date that was here */}
                  </div>

                  {/* Action buttons - all in one row */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!collapsedGoals[goal.id] && (
                      <CustomDropdown
                        items={[
                          {
                            label: "Clear Progress",
                            icon: <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />,
                            onClick: () => clearProgress(goal.id),
                          },
                          {
                            label: "Fill All Dates",
                            icon: <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />,
                            onClick: () => fillProgress(goal.id),
                          },
                          {
                            label: "Share Goal",
                            icon: <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />,
                            onClick: () => {
                              const completedDays = countValidProgressDays(goal)
                              const today = new Date()
                              const formattedDate = format(today, "MMMM d, yyyy")
                              const text = `📊 Streak - ${formattedDate}\n\n☑️ Day ${completedDays}: ${goal.title}`
                              setShareText(text)
                              setShareDialogOpen(true)
                            },
                          },
                          {
                            label: "Delete Goal",
                            icon: <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />,
                            onClick: () => confirmDeleteGoal(goal.id),
                            className: "text-destructive",
                          },
                        ]}
                      />
                    )}

                    {/* Reorder buttons */}
                    <GoalReorderButtons
                      goal={goal}
                      isFirst={index === 0}
                      isLast={index === activeTabGoals.length - 1}
                      onMoveUp={() => moveGoalUp(goal.id)}
                      onMoveDown={() => moveGoalDown(goal.id)}
                      isMoving={isMoving}
                    />
                  </div>
                </div>

                {!collapsedGoals[goal.id] && (
                  <StreakBar
                    startDate={goal.startDate}
                    endDate={goal.endDate}
                    progress={goal.progress}
                    color={goal.color}
                    notes={goal.notes}
                    frequency={goal.frequency}
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
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
              {tabs.length > 0
                ? `No goals added to this tab yet. Add your first goal to get started!`
                : `No goals added yet. Add your first goal to get started!`}
            </p>
          </div>
        )}
      </div>

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

      {/* Delete Tab Confirmation Dialog */}
      <MobileDialog
        isOpen={deleteTabDialogOpen}
        onClose={() => setDeleteTabDialogOpen(false)}
        title="Delete Tab"
        description={`Are you sure you want to delete the "${deleteTabInfo?.tabName}" tab? All goals in this tab will be moved to another tab.`}
        onConfirm={deleteTab}
        confirmText="Delete Tab"
        cancelText="Cancel"
      />

      {/* Share Dialog */}
      <MobileDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        title="Share Summary"
        description={
          <div className="mt-2">
            <div className="bg-muted p-3 rounded-md text-xs sm:text-sm mb-4 whitespace-pre-wrap">{shareText}</div>
            <div className="flex flex-col gap-2">
              <Button onClick={shareToTwitter} className="w-full">
                Share to X (Twitter)
              </Button>
              <Button onClick={copyToClipboard} variant="outline" className="w-full">
                Copy to Clipboard
              </Button>
            </div>
          </div>
        }
        onConfirm={() => setShareDialogOpen(false)}
        confirmText="Close"
        cancelText=""
      />

      {/* Goal Celebration Animation */}
      <GoalCelebration
        isVisible={celebrationVisible}
        color={celebrationColor}
        sourceRect={celebrationRect}
        onComplete={handleCelebrationComplete}
        isFrequencyGoal={isFrequencyGoal}
      />

      {/* Achievement Popup */}
      <AchievementPopup
        isVisible={achievementPopupVisible}
        goalTitle={achievedGoalTitle}
        onClose={() => setAchievementPopupVisible(false)}
        isFrequencyGoal={isFrequencyGoal}
        frequencyText={frequencyText}
      />
    </div>
  )
}

// Make sure the component is properly exported as default as well
export default GoalTracker
