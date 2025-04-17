"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface AchievementPopupProps {
  isVisible: boolean
  goalTitle: string
  onClose: () => void
  isFrequencyGoal?: boolean
  frequencyText?: string
}

export function AchievementPopup({
  isVisible,
  goalTitle,
  onClose,
  isFrequencyGoal = false,
  frequencyText = "",
}: AchievementPopupProps) {
  const [mounted, setMounted] = useState(false)
  const [animation, setAnimation] = useState<"enter" | "exit" | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isVisible) {
      setAnimation("enter")

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setAnimation("exit")

        // Wait for exit animation to complete before calling onClose
        const exitTimer = setTimeout(() => {
          onClose()
        }, 500) // Match this with the CSS transition duration

        return () => clearTimeout(exitTimer)
      }, 5000)

      return () => clearTimeout(timer)
    } else {
      setAnimation(null)
    }
  }, [isVisible, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "fixed top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto",
        "transition-all duration-500 ease-in-out",
        animation === "enter" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-16",
        !isVisible && "hidden",
      )}
    >
      <div
        className={cn(
          "bg-background border border-border rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md",
          isFrequencyGoal && "animate-pulse-subtle",
        )}
      >
        <div
          className={cn(
            "flex-shrink-0",
            isFrequencyGoal ? "text-yellow-500 dark:text-yellow-400" : "text-green-500 dark:text-green-400",
          )}
        >
          {isFrequencyGoal ? <Award className="h-8 w-8" /> : <CheckCircle className="h-8 w-8" />}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{isFrequencyGoal ? "Frequency Goal Achieved!" : "Goal Achieved!"}</h3>
          <p className="text-muted-foreground">{goalTitle}</p>
          {isFrequencyGoal && frequencyText && <p className="text-xs mt-1 text-muted-foreground">{frequencyText}</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
