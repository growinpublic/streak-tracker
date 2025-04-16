"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Save, Edit, Trash } from "lucide-react"
import type { TabRecord } from "@/lib/db"

interface TabOptionsDialogProps {
  isOpen: boolean
  onClose: () => void
  tab: TabRecord | null
  onRename: (tabId: string, newName: string) => void
  onDelete: (tabId: string) => void
  canDelete: boolean
}

export function TabOptionsDialog({ isOpen, onClose, tab, onRename, onDelete, canDelete }: TabOptionsDialogProps) {
  const [tabName, setTabName] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize tab name when dialog opens or tab changes
  useEffect(() => {
    if (tab) {
      setTabName(tab.name)
    }
    setMounted(true)
  }, [isOpen, tab])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!mounted || !isOpen || !tab) return null

  const handleStartEditing = () => {
    setIsEditing(true)
  }

  const handleSaveTabName = () => {
    if (tabName.trim() && tab) {
      onRename(tab.id, tabName.trim())
      setIsEditing(false)
    }
  }

  const handleCancelEditing = () => {
    if (tab) {
      setTabName(tab.name)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveTabName()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancelEditing()
    }
  }

  const handleDeleteTab = () => {
    if (tab) {
      onDelete(tab.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      style={{ width: "100vw", height: "100vh" }}
      onClick={(e) => {
        // Close dialog when clicking outside
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-[90vw] max-h-[80vh] overflow-auto bg-background rounded-lg shadow-lg"
        style={{ maxWidth: "400px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Tab Options</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tab Name</h3>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  autoFocus
                />
                <Button variant="ghost" size="icon" onClick={handleSaveTabName} aria-label="Save tab name">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancelEditing} aria-label="Cancel editing">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base">{tab.name}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleStartEditing}
                  className="ml-2"
                  aria-label="Rename tab"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {!canDelete && (
            <p className="text-xs text-muted-foreground mt-2">
              You cannot delete the last tab. Create another tab first.
            </p>
          )}
        </div>

        <div className="flex justify-between p-4 border-t">
          <Button variant="destructive" onClick={handleDeleteTab} disabled={!canDelete}>
            <Trash className="h-4 w-4 mr-2" />
            Delete Tab
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
