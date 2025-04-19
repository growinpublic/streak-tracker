"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getAllGoals, addGoal, deleteGoal, type GoalRecord } from "@/lib/db"
import Papa from "papaparse" // Import PapaParse as a default import

export function ImportExport({ onImportComplete }: { onImportComplete: () => void }) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export all streaks to CSV
  const handleExport = async () => {
    try {
      setExporting(true)

      // Get all streaks from the database
      const streaks = await getAllGoals()

      // Transform data for CSV export
      const exportData = streaks.map((streak) => {
        // Convert notes object to JSON string
        const notesJson = JSON.stringify(streak.notes || {})

        return {
          id: streak.id,
          title: streak.title,
          startDate: streak.startDate,
          endDate: streak.endDate,
          color: streak.color,
          progress: streak.progress.join("|"), // Join progress dates with a pipe character
          order: streak.order || 0, // Include order in export
          notes: notesJson, // Add notes as JSON string
        }
      })

      // Convert to CSV
      const csv = Papa.unparse(exportData)

      // Create a download link
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `streak-tracker-export-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setExporting(false)
    }
  }

  // Trigger file input click
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setShowImportDialog(true)
    setImportStatus(null)

    // Parse the CSV file
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          setImporting(true)

          // Validate and transform the data
          if (results.errors.length > 0) {
            throw new Error("CSV parsing error: " + results.errors[0].message)
          }

          const importData = results.data as any[]

          // Validate required fields
          const invalidRows = importData.filter(
            (row) => !row.id || !row.title || !row.startDate || !row.endDate || !row.color,
          )

          if (invalidRows.length > 0) {
            throw new Error(`${invalidRows.length} rows have missing required fields`)
          }

          // Transform data for database
          const streaks: GoalRecord[] = importData.map((row, index) => {
            // Parse notes from JSON string or use empty object
            let notes = {}
            try {
              if (row.notes) {
                notes = JSON.parse(row.notes)
              }
            } catch (e) {
              console.warn("Failed to parse notes for row:", row.id)
            }

            return {
              id: row.id,
              title: row.title,
              startDate: row.startDate,
              endDate: row.endDate,
              color: row.color,
              progress: row.progress ? row.progress.split("|").filter(Boolean) : [],
              order: row.order !== undefined ? Number(row.order) : index, // Use provided order or index
              notes: notes, // Add parsed notes
            }
          })

          // Clear existing data
          const existingStreaks = await getAllGoals()
          for (const streak of existingStreaks) {
            await deleteGoal(streak.id)
          }

          // Import new data
          for (const streak of streaks) {
            await addGoal(streak)
          }

          setImportStatus({
            success: true,
            message: `Successfully imported ${streaks.length} streaks`,
          })

          // Refresh the UI
          onImportComplete()
        } catch (error) {
          console.error("Import failed:", error)
          setImportStatus({
            success: false,
            message: error instanceof Error ? error.message : "Import failed",
          })
        } finally {
          setImporting(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      },
      error: (error) => {
        setImportStatus({
          success: false,
          message: `Failed to parse CSV: ${error.message}`,
        })
        setImporting(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      },
    })
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-max touch-scroll">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="whitespace-nowrap">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export CSV"}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportClick}
          disabled={importing}
          className="whitespace-nowrap"
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{importing ? "Importing..." : "Import CSV"}</span>
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Streaks</DialogTitle>
            <DialogDescription>
              Importing will replace all existing streaks with the data from the CSV file.
            </DialogDescription>
          </DialogHeader>

          {importStatus && (
            <Alert variant={importStatus.success ? "default" : "destructive"}>
              {importStatus.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{importStatus.success ? "Import Successful" : "Import Failed"}</AlertTitle>
              <AlertDescription>{importStatus.message}</AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
