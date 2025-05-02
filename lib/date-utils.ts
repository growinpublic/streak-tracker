import { format, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval, isSameDay } from "date-fns"

// Define what day a week starts on (0 = Sunday, 1 = Monday, etc.)
export const WEEK_START_DAY = 1 // Monday as default

/**
 * Gets a unique identifier for the week that contains the given date
 * @param date The date to get the week identifier for
 * @returns A string in the format 'yyyy-MM-dd' representing the start of the week
 */
export function getWeekIdentifier(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: WEEK_START_DAY })
  return format(weekStart, "yyyy-MM-dd")
}

/**
 * Groups an array of date strings by their calendar week
 * @param dates Array of date strings in 'yyyy-MM-dd' format
 * @returns An object with week identifiers as keys and arrays of dates as values
 */
export function groupDatesByWeek(dates: string[]): Record<string, string[]> {
  return dates.reduce((acc: Record<string, string[]>, dateStr) => {
    const date = new Date(dateStr)
    const weekId = getWeekIdentifier(date)

    if (!acc[weekId]) {
      acc[weekId] = []
    }

    acc[weekId].push(dateStr)
    return acc
  }, {})
}

/**
 * Gets all weeks (partial or complete) that fall within a date range
 * @param startDate The start date of the range
 * @param endDate The end date of the range
 * @returns An array of objects representing each week in the range
 */
export function getWeeksInRange(
  startDate: Date,
  endDate: Date,
): Array<{
  weekId: string
  start: Date
  end: Date
  daysInGoal: number
}> {
  // Ensure we have Date objects
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Get all weeks that intersect with the date range
  const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: WEEK_START_DAY })

  return allWeeks.map((weekStartDate) => {
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: WEEK_START_DAY })

    // Calculate how many days of this week fall within the goal range
    let daysInGoal = 0
    const currentDay = new Date(weekStartDate)

    while (currentDay <= weekEndDate) {
      if (isWithinInterval(currentDay, { start, end }) || isSameDay(currentDay, start) || isSameDay(currentDay, end)) {
        daysInGoal++
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return {
      weekId: format(weekStartDate, "yyyy-MM-dd"),
      start: weekStartDate,
      end: weekEndDate,
      daysInGoal,
    }
  })
}

/**
 * Calculate the total required completions for a weekly goal
 * @param startDate Goal start date
 * @param endDate Goal end date
 * @param requiredPerWeek Number of completions required per week
 * @returns Total number of required completions
 */
export function calculateTotalRequiredCompletions(startDate: Date, endDate: Date, requiredPerWeek: number): number {
  // Get all weeks in the goal range
  const weeksInRange = getWeeksInRange(startDate, endDate)

  // Calculate total required completions
  let totalRequired = 0

  weeksInRange.forEach((week) => {
    // For partial weeks, prorate the requirement
    const fullWeekDays = 7
    const adjustedRequirement = Math.ceil((requiredPerWeek * week.daysInGoal) / fullWeekDays)

    totalRequired += adjustedRequirement
  })

  return totalRequired
}

/**
 * Checks if a weekly frequency goal is completed
 * @param progress Array of completed date strings
 * @param startDate Goal start date
 * @param endDate Goal end date
 * @param requiredPerWeek Number of completions required per week
 * @returns Boolean indicating if the goal is completed
 */
export function isWeeklyGoalCompleted(
  progress: string[],
  startDate: Date,
  endDate: Date,
  requiredPerWeek: number,
): boolean {
  // Group progress dates by week
  const progressByWeek = groupDatesByWeek(progress)

  // Get all weeks in the goal range
  const weeksInRange = getWeeksInRange(startDate, endDate)

  // Check if each week meets its requirement
  const incompleteWeeks = weeksInRange.filter((week) => {
    // Get progress for this week
    const weekProgress = progressByWeek[week.weekId] || []

    // For partial weeks, prorate the requirement
    const fullWeekDays = 7
    const adjustedRequirement = Math.ceil((requiredPerWeek * week.daysInGoal) / fullWeekDays)

    // Check if this week meets its requirement
    return weekProgress.length < adjustedRequirement
  })

  // Goal is complete if all weeks meet their requirements
  return incompleteWeeks.length === 0
}

/**
 * Calculates the completion percentage for a weekly frequency goal
 * @param progress Array of completed date strings
 * @param startDate Goal start date
 * @param endDate Goal end date
 * @param requiredPerWeek Number of completions required per week
 * @returns Number between 0-100 representing completion percentage
 */
export function calculateWeeklyGoalCompletion(
  progress: string[],
  startDate: Date,
  endDate: Date,
  requiredPerWeek: number,
): number {
  // Group progress dates by week
  const progressByWeek = groupDatesByWeek(progress)

  // Get all weeks in the goal range
  const weeksInRange = getWeeksInRange(startDate, endDate)

  // Calculate total required completions and actual completions
  // Use the shared calculation function for total required
  const totalRequired = calculateTotalRequiredCompletions(startDate, endDate, requiredPerWeek)
  let totalCompleted = 0

  weeksInRange.forEach((week) => {
    // Get progress for this week
    const weekProgress = progressByWeek[week.weekId] || []

    // For partial weeks, prorate the requirement
    const fullWeekDays = 7
    const adjustedRequirement = Math.ceil((requiredPerWeek * week.daysInGoal) / fullWeekDays)

    totalCompleted += Math.min(weekProgress.length, adjustedRequirement)
  })

  // Calculate percentage
  return totalRequired > 0 ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100)) : 0
}
