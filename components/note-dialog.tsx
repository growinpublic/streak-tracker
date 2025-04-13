"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface NoteDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  initialNote: string
  onSave: (note: string) => void
  title?: string
}

export function NoteDialog({ isOpen, onClose, date, initialNote, onSave, title = "Add Note" }: NoteDialogProps) {
  const [note, setNote] = useState(initialNote)
  const [mounted, setMounted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Format the date for display
  const formattedDate = date ? format(new Date(date), "EEEE, MMMM d, yyyy") : ""

  // Handle body scroll locking
  useEffect(() => {
    setMounted(true)

    if (isOpen) {
      document.body.style.overflow = "hidden"
      // Focus the textarea when dialog opens
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Reset note when dialog opens with new initialNote
  useEffect(() => {
    setNote(initialNote)
  }, [initialNote, isOpen])

  if (!mounted || !isOpen) return null

  const handleSave = () => {
    onSave(note)
    onClose()
  }

  const handleSkip = () => {
    onClose()
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
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <Textarea
            ref={textareaRef}
            placeholder="What did you accomplish today?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px]"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleSave}>Add</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
