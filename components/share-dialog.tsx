"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  shareText: string
}

export function ShareDialog({ isOpen, onClose, shareText }: ShareDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

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

  if (!mounted || !isOpen) return null

  const shareToTwitter = () => {
    const encodedText = encodeURIComponent(shareText)
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank")
  }

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err)
      })
  }

  // Determine if this is a single goal or multiple goals
  const isSingleGoal = shareText.split("\n").filter((line) => line.trim().startsWith("☑️")).length === 1
  const dialogTitle = isSingleGoal ? "Share Goal" : "Share Goals Summary"

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
        style={{ maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{dialogTitle}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="bg-muted p-3 rounded-md text-xs sm:text-sm mb-4 whitespace-pre-wrap">{shareText}</div>
          <div className="flex flex-col gap-2">
            <Button onClick={shareToTwitter} variant="outline" className="w-full">
              Share to X (Twitter)
            </Button>
            <Button onClick={copyToClipboard} className="w-full">
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
