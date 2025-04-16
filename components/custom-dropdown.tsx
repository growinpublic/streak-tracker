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
  disabled?: boolean
}

interface CustomDropdownProps {
  items: DropdownItem[]
  trigger?: React.ReactNode
}

export function CustomDropdown({ items, trigger }: CustomDropdownProps) {
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
      {trigger ? (
        // Make sure the trigger is clickable
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Goal actions"
        >
          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 sm:w-48 rounded-md shadow-lg bg-popover border border-border z-50">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                  item.className,
                )}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    setIsOpen(false)
                  }
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className="mr-1.5 sm:mr-2">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
