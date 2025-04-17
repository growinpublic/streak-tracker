"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Goal } from "./goal-tracker"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface GoalFormProps {
  onSubmit: (goal: Omit<Goal, "id" | "progress" | "order" | "notes" | "tabId">) => void
  onCancel: () => void
}

// Predefined colors for the color picker
const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#14b8a6", // teal-500
  "#ef4444", // red-500
]

export function GoalForm({ onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [color, setColor] = useState(COLORS[0])

  // New state for frequency
  const [useFrequency, setUseFrequency] = useState(false)
  const [frequencyCount, setFrequencyCount] = useState(1)
  const [frequencyPeriod, setFrequencyPeriod] = useState<"day" | "week" | "month">("week")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !startDate || !endDate) return

    const goal: Omit<Goal, "id" | "progress" | "order" | "notes" | "tabId"> = {
      title,
      startDate,
      endDate,
      color,
    }

    // Add frequency if enabled
    if (useFrequency) {
      goal.frequency = {
        count: frequencyCount,
        period: frequencyPeriod,
      }
    }

    onSubmit(goal)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg border-border">
      <div className="space-y-2">
        <Label htmlFor="title">Goal Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your goal"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
                disabled={(date) => date < startDate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Frequency settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="use-frequency" className="cursor-pointer">
            Use Frequency
          </Label>
          <Switch id="use-frequency" checked={useFrequency} onCheckedChange={setUseFrequency} />
        </div>

        {useFrequency && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="frequency-count">How many times</Label>
              <Input
                id="frequency-count"
                type="number"
                min={1}
                max={31}
                value={frequencyCount}
                onChange={(e) => setFrequencyCount(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency-period">Per</Label>
              <Select
                value={frequencyPeriod}
                onValueChange={(value) => setFrequencyPeriod(value as "day" | "week" | "month")}
              >
                <SelectTrigger id="frequency-period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Goal Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "w-8 h-8 rounded-full transition-all",
                color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "",
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
            />
          ))}
          <div className="flex items-center">
            <Label htmlFor="custom-color" className="sr-only">
              Custom Color
            </Label>
            <Input
              id="custom-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Goal</Button>
      </div>
    </form>
  )
}
