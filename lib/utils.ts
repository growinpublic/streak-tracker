import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert from database record to Goal object
export function recordToGoal(record: any) {
  return {
    ...record,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    order: record.order || 0, // Default to 0 if order is not set
    notes: record.notes || {}, // Default to empty object if notes is not set
    tabId: record.tabId || "", // Default to empty string if tabId is not set
  }
}

// Helper function to convert from Goal object to database record
export function goalToRecord(goal: any) {
  return {
    ...goal,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    order: goal.order || 0, // Default to 0 if order is not set
    notes: goal.notes || {}, // Default to empty object if notes is not set
    tabId: goal.tabId || "", // Default to empty string if tabId is not set
  }
}
