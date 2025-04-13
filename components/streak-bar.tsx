"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import {
  differenceInDays,
  format,
  getDay,
  isSameDay,
  startOfYear,
  endOfYear,
  subDays,
  addDays,
  isWithinInterval,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, ChevronLeft, ChevronRight, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StreakBarProps {
  startDate: Date
  endDate: Date
  progress: string[] // ISO date strings
  color: string // Added color property
  onDateClick: (date: string) => void
  onExtendEndDate?: (date: string) => void // New prop for extending end date
}

// Days of week for labels
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function StreakBar({ startDate, endDate, progress, color, onDateClick, onExtendEndDate }: StreakBarProps) {
  // Get the current year for initial state
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today to start of day
  const currentYear = today.getFullYear()

  // State for the displayed year
  const [displayYear, setDisplayYear] = useState(currentYear)
  const [cells, setCells] = useState<Date[][]>([])
  const [monthLabels, setMonthLabels] = useState<{ month: string; weekIndex: number }[]>([])
  const [labelPositions, setLabelPositions] = useState<number[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const weekRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  // Navigate to previous year
  const goToPreviousYear = () => {
    setDisplayYear((prev) => prev - 1)
  }

  // Navigate to next year
  const goToNextYear = () => {
    setDisplayYear((prev) => prev + 1)
  }

  // Generate calendar grid for the selected year
  useEffect(() => {
    // Create a 7×53 grid (7 rows for days, up to 53 columns for weeks in a year)
    const grid: Date[][] = []

    // Start with January 1st of the displayed year
    const yearStart = startOfYear(new Date(displayYear, 0, 1))

    // End with December 31st of the displayed year
    const yearEnd = endOfYear(new Date(displayYear, 0, 1))

    // Find the first Sunday before or on January 1st
    const firstSunday = getDay(yearStart) === 0 ? yearStart : subDays(yearStart, getDay(yearStart))

    // Initialize the grid with 7 empty rows
    for (let i = 0; i < 7; i++) {
      grid[i] = []
    }

    // Calculate how many weeks we need (could be 52 or 53)
    const lastSunday = getDay(yearEnd) === 0 ? yearEnd : subDays(yearEnd, getDay(yearEnd))
    const weeksNeeded = Math.ceil(differenceInDays(lastSunday, firstSunday) / 7) + 1

    // Fill the grid with dates
    for (let week = 0; week < weeksNeeded; week++) {
      for (let day = 0; day < 7; day++) {
        const date = addDays(firstSunday, week * 7 + day)
        grid[day].push(date)
      }
    }

    setCells(grid)

    // Reset weekRefs array to match the number of weeks
    weekRefs.current = Array(weeksNeeded).fill(null)

    // Find the first week of each month
    const labels: { month: string; weekIndex: number }[] = []
    const monthsFound = new Set<number>()

    // We'll use the first row (Sundays) to find month transitions
    const sundays = grid[0]

    for (let weekIndex = 0; weekIndex < sundays.length; weekIndex++) {
      const date = sundays[weekIndex]

      // Only consider dates in the current year
      if (date.getFullYear() === displayYear) {
        const month = date.getMonth()

        // If we haven't found this month yet
        if (!monthsFound.has(month)) {
          labels.push({
            month: format(date, "MMM"),
            weekIndex: weekIndex,
          })

          monthsFound.add(month)
        }
      }
    }

    setMonthLabels(labels)
    // Reset positions when labels change
    setLabelPositions(Array(labels.length).fill(0))

    // Reset labelRefs array to match the number of labels
    labelRefs.current = Array(labels.length).fill(null)
  }, [displayYear]) // Re-run when displayYear changes

  // Calculate label positions after DOM is updated
  useEffect(() => {
    // Skip if no labels or grid
    if (!monthLabels.length || !gridRef.current) return

    // Use requestAnimationFrame to ensure DOM is updated
    const rafId = requestAnimationFrame(() => {
      const newPositions = monthLabels.map((label) => {
        const weekRef = weekRefs.current[label.weekIndex]
        if (!weekRef || !gridRef.current) return 0

        const rect = weekRef.getBoundingClientRect()
        const gridRect = gridRef.current.getBoundingClientRect()
        return rect.left - gridRect.left
      })

      setLabelPositions(newPositions)
    })

    return () => cancelAnimationFrame(rafId)
  }, [monthLabels, cells]) // Re-run when labels or cells change

  // Debug function to log positions
  const logPositions = () => {
    console.log("--- DEBUG: POSITIONS ---")

    // Log week positions
    console.log("WEEK POSITIONS:")
    weekRefs.current.forEach((weekRef, index) => {
      if (weekRef && gridRef.current) {
        const rect = weekRef.getBoundingClientRect()
        const gridRect = gridRef.current.getBoundingClientRect()
        const position = rect.left - gridRect.left
        const date = cells[0][index]
        console.log(`Week ${index} (${format(date, "yyyy-MM-dd")}): ${position}px`)
      }
    })

    // Log label positions
    console.log("LABEL POSITIONS:")
    labelRefs.current.forEach((labelRef, index) => {
      if (labelRef && gridRef.current && index < monthLabels.length) {
        const rect = labelRef.getBoundingClientRect()
        const gridRect = gridRef.current.getBoundingClientRect()
        const position = rect.left - gridRect.left

        const weekIndex = monthLabels[index].weekIndex
        const weekRef = weekRefs.current[weekIndex]
        let weekPosition = 0
        if (weekRef) {
          const weekRect = weekRef.getBoundingClientRect()
          weekPosition = weekRect.left - gridRect.left
        }

        console.log(
          `Label ${index} (${monthLabels[index].month}): ${position}px (should be at week ${weekIndex}: ${weekPosition}px)`,
        )
      }
    })

    console.log("--- END DEBUG ---")
  }

  const getDateStatus = (date: Date) => {
    // Normalize dates for comparison
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    // Check if the date is from the displayed year
    const isDisplayedYear = normalizedDate.getFullYear() === displayYear
    if (!isDisplayedYear) return "previous-year"

    // Normalize goal dates
    const goalStartDay = new Date(startDate)
    goalStartDay.setHours(0, 0, 0, 0)

    const goalEndDay = new Date(endDate)
    goalEndDay.setHours(0, 0, 0, 0)

    // Check if date is completed
    const isCompleted = progress.some((progressDate) => {
      const progressDay = new Date(progressDate)
      progressDay.setHours(0, 0, 0, 0)
      return progressDay.getTime() === normalizedDate.getTime()
    })

    // Check if date is within goal range
    const isInRange =
      normalizedDate.getTime() >= goalStartDay.getTime() && normalizedDate.getTime() <= goalEndDay.getTime()

    // Check if it's today
    const isToday = normalizedDate.getTime() === today.getTime()

    // Check if it's a future date
    const isFutureDate = normalizedDate.getTime() > today.getTime()

    // Determine status based on conditions above
    if (isInRange && isCompleted) return "completed"
    if (isToday) return "today"
    if (isInRange && isFutureDate) return "future"
    if (isInRange) return "missed"
    return "out-of-range"
  }

  const handleDateClick = (date: Date) => {
    // Only allow clicking on dates from the displayed year
    if (date.getFullYear() !== displayYear) return

    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    // Check if date is within the goal's range
    const goalStartDay = new Date(startDate)
    goalStartDay.setHours(0, 0, 0, 0)

    const goalEndDay = new Date(endDate)
    goalEndDay.setHours(0, 0, 0, 0)

    // Format as YYYY-MM-DD
    const dateStr = format(date, "yyyy-MM-dd")

    // Check if it's within the goal range
    const isInRange =
      normalizedDate.getTime() >= goalStartDay.getTime() && normalizedDate.getTime() <= goalEndDay.getTime()

    // If it's a future date outside the goal range and we have the extension handler
    if (normalizedDate.getTime() > goalEndDay.getTime() && onExtendEndDate) {
      onExtendEndDate(dateStr)
      return
    }

    // If it's within the goal range, toggle completion
    if (isInRange) {
      onDateClick(dateStr)
    }
  }

  const calculateCompletion = () => {
    if (progress.length === 0) return 0

    // Normalize dates for comparison
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    // Calculate total days in the goal range (inclusive)
    const totalDays = differenceInDays(end, start) + 1

    // Count only progress dates that are within the goal range
    const validProgressDates = progress.filter((dateStr) => {
      const date = new Date(dateStr)
      date.setHours(0, 0, 0, 0)
      return isWithinInterval(date, { start, end })
    })

    // Calculate percentage
    return Math.min(100, Math.round((validProgressDates.length / totalDays) * 100))
  }

  // Find today's position if we're viewing the current year
  const findTodayPosition = () => {
    if (displayYear !== currentYear) return null

    for (let dayIndex = 0; dayIndex < cells.length; dayIndex++) {
      for (let weekIndex = 0; weekIndex < cells[dayIndex].length; weekIndex++) {
        if (isSameDay(cells[dayIndex][weekIndex], today)) {
          return { dayIndex, weekIndex }
        }
      }
    }
    return null
  }

  const todayPosition = findTodayPosition()

  // Generate hover color by darkening the base color
  const getHoverColor = (baseColor: string) => {
    // Simple darkening function - in a real app you might want a more sophisticated approach
    try {
      // For hex colors
      if (baseColor.startsWith("#")) {
        const r = Number.parseInt(baseColor.slice(1, 3), 16)
        const g = Number.parseInt(baseColor.slice(3, 5), 16)
        const b = Number.parseInt(baseColor.slice(5, 7), 16)

        const darkenFactor = 0.15
        const darkenR = Math.max(0, Math.floor(r * (1 - darkenFactor)))
        const darkenG = Math.max(0, Math.floor(g * (1 - darkenFactor)))
        const darkenB = Math.max(0, Math.floor(b * (1 - darkenFactor)))

        return `#${darkenR.toString(16).padStart(2, "0")}${darkenG.toString(16).padStart(2, "0")}${darkenB.toString(16).padStart(2, "0")}`
      }
      return baseColor
    } catch (e) {
      return baseColor
    }
  }

  // Count valid progress days (only those within the goal range)
  const countValidProgressDays = () => {
    // Normalize dates for comparison
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    // Count only progress dates that are within the goal range
    return progress.filter((dateStr) => {
      const date = new Date(dateStr)
      date.setHours(0, 0, 0, 0)
      return isWithinInterval(date, { start, end })
    }).length
  }

  // Check if the goal spans multiple years
  const goalStartYear = new Date(startDate).getFullYear()
  const goalEndYear = new Date(endDate).getFullYear()
  const isMultiYearGoal = goalStartYear !== goalEndYear

  // Calculate total days in the goal
  const totalDays = differenceInDays(new Date(endDate), new Date(startDate)) + 1

  // Force recalculation of positions
  const forceRecalculate = () => {
    if (!monthLabels.length || !gridRef.current) return

    const newPositions = monthLabels.map((label) => {
      const weekRef = weekRefs.current[label.weekIndex]
      if (!weekRef || !gridRef.current) return 0

      const rect = weekRef.getBoundingClientRect()
      const gridRect = gridRef.current.getBoundingClientRect()
      return rect.left - gridRect.left
    })

    setLabelPositions(newPositions)

    // Log the new positions
    console.log("Recalculated positions:", newPositions)
  }

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousYear}
              className="h-8 w-8"
              aria-label="Previous Year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm font-medium">
              {displayYear} Activity
              {isMultiYearGoal && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Range spans {goalStartYear} - {goalEndYear})
                </span>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextYear} className="h-8 w-8" aria-label="Next Year">
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Debug button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={logPositions}
              className="h-8 w-8 ml-2"
              aria-label="Debug Positions"
              title="Log positions to console"
            >
              <Bug className="h-4 w-4" />
            </Button>

            {/* Force recalculate button */}
            <Button
              variant="outline"
              size="sm"
              onClick={forceRecalculate}
              className="ml-2"
              title="Force recalculate positions"
            >
              Recalculate
            </Button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <div className="space-y-2 p-1">
                <p className="text-xs font-medium">Activity Legend</p>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }}></div>
                  <span className="text-xs">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-muted"></div>
                  <span className="text-xs">Missed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-900"></div>
                  <span className="text-xs">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-muted/50"></div>
                  <span className="text-xs">Future</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-muted/20"></div>
                  <span className="text-xs">Out of Range (Click to extend end date)</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex">
          {/* Day of week labels */}
          <div className="flex flex-col pr-2 w-10">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={day} className="h-4 mb-1 text-xs text-muted-foreground flex items-center justify-end">
                {index % 2 === 0 ? day : ""}
              </div>
            ))}
          </div>

          {/* Calendar grid with month labels */}
          <div className="w-full overflow-x-auto pb-2" ref={gridRef}>
            {/* Month labels - positioned above the grid */}
            <div className="relative h-5 mb-1">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-muted-foreground whitespace-nowrap"
                  style={{
                    left: `${labelPositions[i]}px`, // Use the calculated position
                  }}
                  ref={(el) => (labelRefs.current[i] = el)}
                >
                  {label.month}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-1 min-w-[800px]">
              {cells.length > 0 &&
                cells[0].map((_, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="flex flex-col gap-1"
                    style={{
                      width: "16px",
                      minWidth: "16px",
                    }}
                    ref={(el) => (weekRefs.current[weekIndex] = el)}
                  >
                    {cells.map((dayRow, dayIndex) => {
                      if (weekIndex >= dayRow.length) return null

                      const date = dayRow[weekIndex]
                      const status = getDateStatus(date)
                      const isToday =
                        todayPosition && todayPosition.dayIndex === dayIndex && todayPosition.weekIndex === weekIndex

                      // Custom styles based on status
                      const cellStyle = {
                        ...(status === "completed" && {
                          backgroundColor: color,
                          "--hover-color": getHoverColor(color),
                        }),
                      }

                      return (
                        <Tooltip key={`${dayIndex}-${weekIndex}`}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "h-4 w-full rounded-sm transition-colors",
                                status === "completed" && "hover:bg-[var(--hover-color)]",
                                status === "missed" && "bg-muted hover:bg-muted/80",
                                status === "today" &&
                                  "bg-blue-200 dark:bg-blue-900 hover:bg-blue-300 dark:hover:bg-blue-800",
                                status === "future" && "bg-muted/50 hover:bg-muted/40",
                                status === "out-of-range" && "bg-muted/20 hover:bg-muted/30",
                                status === "previous-year" && "opacity-0",
                                status === "previous-year" && "cursor-not-allowed",
                                isToday && "ring-2 ring-blue-500",
                              )}
                              style={cellStyle as React.CSSProperties}
                              onClick={() => handleDateClick(date)}
                              disabled={status === "previous-year"}
                              aria-label={format(date, "EEEE, MMMM d, yyyy")}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            <div className="text-xs">
                              <p className="font-medium">{format(date, "EEEE, MMMM d, yyyy")}</p>
                              <p>
                                {status === "completed" && "Completed"}
                                {status === "missed" && "Missed"}
                                {status === "today" && "Today"}
                                {status === "future" && "Future"}
                                {status === "out-of-range" &&
                                  (date.getTime() > new Date(endDate).getTime()
                                    ? "Click to extend end date"
                                    : "Out of Goal Range")}
                                {status === "previous-year" && "Previous Year"}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-sm">
            {countValidProgressDays()} of {totalDays} days completed
          </div>
          <div className="text-sm font-medium">{calculateCompletion()}% complete</div>
        </div>
      </div>
    </TooltipProvider>
  )
}
