"use client"

import type React from "react"

import { useState, useRef } from "react"
import { db } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

export function ImportExport() {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setIsExporting(true)

      // Get all data from the database
      const goals = await db.goals.toArray()
      const tabs = await db.tabs.toArray()
      const activeTab = await db.activeTab.get(1)

      // Create export object
      const exportData = {
        goals,
        tabs,
        activeTab,
      }

      // Convert to JSON and create download link
      const dataStr = JSON.stringify(exportData)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileName = `streak-tracker-export-${new Date().toISOString().split("T")[0]}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileName)
      linkElement.click()

      toast({
        title: "Export successful",
        description: "Your data has been exported successfully",
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export failed",
        description: "There was an error exporting your data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)

      const fileContent = await file.text()
      const importData = JSON.parse(fileContent)

      // Validate the imported data structure
      if (!importData.goals || !Array.isArray(importData.goals)) {
        throw new Error("Invalid import file: missing goals data")
      }

      if (!importData.tabs || !Array.isArray(importData.tabs)) {
        throw new Error("Invalid import file: missing tabs data")
      }

      // Clear existing data
      await db.goals.clear()
      await db.tabs.clear()

      // Import new data
      await db.goals.bulkAdd(importData.goals)
      await db.tabs.bulkAdd(importData.tabs)

      // Set active tab if available
      if (importData.activeTab) {
        await db.activeTab.put(importData.activeTab)
      }

      toast({
        title: "Import successful",
        description: "Your data has been imported successfully",
      })

      // Reload the page to reflect changes
      window.location.reload()
    } catch (error) {
      console.error("Import failed:", error)
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "There was an error importing your data",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDeleteAll = async () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteAll = async () => {
    try {
      // Clear all data
      await db.goals.clear()
      await db.tabs.clear()

      // Reset active tab
      await db.activeTab.put({ id: 1, activeTabId: "all" })

      toast({
        title: "Data deleted",
        description: "All your data has been deleted successfully",
      })

      // Close the dialog
      setShowDeleteDialog(false)

      // Reload the page to reflect changes
      window.location.reload()
    } catch (error) {
      console.error("Delete failed:", error)
      toast({
        title: "Delete failed",
        description: "There was an error deleting your data",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
      <Button variant="outline" onClick={handleImportClick} disabled={isImporting} className="flex-1 sm:flex-none">
        {isImporting ? "Importing..." : "Import"}
      </Button>

      <Button variant="outline" onClick={handleExport} disabled={isExporting} className="flex-1 sm:flex-none">
        {isExporting ? "Exporting..." : "Export"}
      </Button>

      <Button
        variant="outline"
        onClick={handleDeleteAll}
        className="flex-1 sm:flex-none text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        Delete All
      </Button>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Delete All
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all your data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
