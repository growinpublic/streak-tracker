"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  className?: string
}

interface CustomDropdownProps {
  items: DropdownItem[]
}

export function CustomDropdown({ items }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Goal actions"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-popover border border-border z-50">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  item.className,
                )}
                onClick={() => {
                  item.onClick()
                  setIsOpen(false)
                }}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
