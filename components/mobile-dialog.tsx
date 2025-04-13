"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MobileDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
}

export function MobileDialog({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: MobileDialogProps) {
  const [mounted, setMounted] = useState(false)

  // Handle body scroll locking
  useEffect(() => {
    setMounted(true)

    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!mounted) return null

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      style={{ width: "100vw", height: "100vh" }}
    >
      <div
        className="w-full max-w-[90vw] max-h-[80vh] overflow-auto bg-background rounded-lg shadow-lg"
        style={{ maxWidth: "400px" }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {description && (
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        <div className="p-4 flex flex-col gap-2">
          <Button onClick={onConfirm} className="w-full">
            {confirmText}
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  )
}
