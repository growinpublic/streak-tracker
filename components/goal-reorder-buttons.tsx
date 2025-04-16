"use client"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import type { Goal } from "./goal-tracker"

interface GoalReorderButtonsProps {
  goal: Goal
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  isMoving: boolean
}

export function GoalReorderButtons({ goal, isFirst, isLast, onMoveUp, onMoveDown, isMoving }: GoalReorderButtonsProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8 relative"
        onClick={onMoveUp}
        disabled={isFirst || isMoving}
        aria-label="Move up"
      >
        {isMoving ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8 relative"
        onClick={onMoveDown}
        disabled={isLast || isMoving}
        aria-label="Move down"
      >
        {isMoving ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
        )}
      </Button>
    </div>
  )
}
