"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { type TabRecord, updateTabName } from "@/lib/db"
import { TabOptionsDialog } from "./tab-options-dialog"

interface TabNavigationProps {
  tabs: TabRecord[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onAddTab: () => void
  onDeleteTab: (tabId: string) => void
  onTabRename?: (tabId: string, newName: string) => void
}

export function TabNavigation({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onDeleteTab,
  onTabRename = () => {},
}: TabNavigationProps) {
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Get the selected tab object from the tabs array
  const selectedTab = selectedTabId ? tabs.find((tab) => tab.id === selectedTabId) || null : null

  // Scroll to active tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTabElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
      if (activeTabElement) {
        const container = scrollContainerRef.current
        const tabRect = activeTabElement.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Calculate the scroll position to center the tab
        const scrollLeft =
          activeTabElement.scrollLeft +
          (tabRect.left - containerRect.left) -
          containerRect.width / 2 +
          tabRect.width / 2

        container.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        })
      }
    }
  }, [activeTabId, tabs])

  // Open options dialog for a tab
  const openOptionsDialog = (tab: TabRecord, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent tab selection
    setSelectedTabId(tab.id)
    setOptionsDialogOpen(true)
  }

  // Handle tab rename
  const handleTabRename = async (tabId: string, newName: string) => {
    try {
      // Update in database
      await updateTabName(tabId, newName)
      console.log(`Tab ${tabId} renamed to ${newName}`)

      // Notify parent component
      onTabRename(tabId, newName)
    } catch (error) {
      console.error("Failed to update tab name:", error)
    }
  }

  return (
    <>
      <div className="mb-6 border border-border rounded-t-lg overflow-hidden">
        <div
          className="bg-muted/30 flex items-center overflow-x-auto scrollbar-hide touch-scroll"
          ref={scrollContainerRef}
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="flex space-x-0 w-full h-full items-center">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "relative group flex items-center min-w-[120px] max-w-[200px]",
                  "border-r border-border transition-colors",
                  activeTabId === tab.id ? "bg-background" : "bg-muted/50 hover:bg-muted/70",
                )}
                data-tab-id={tab.id}
              >
                <div className="flex items-center w-full">
                  <button
                    className={cn(
                      "px-4 py-3 text-sm transition-colors flex-grow text-left truncate",
                      activeTabId === tab.id
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium",
                    )}
                    onClick={() => onTabChange(tab.id)}
                  >
                    <span className="truncate">{tab.name}</span>
                  </button>

                  <div className="flex items-center pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => openOptionsDialog(tab, e)}
                      aria-label="Tab options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="h-full px-4 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-full px-2 py-1 rounded-sm whitespace-nowrap"
                onClick={onAddTab}
                aria-label="Add new tab"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">New Tab</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-green-500 to-purple-300"></div>
      </div>

      {/* Tab Options Dialog */}
      <TabOptionsDialog
        isOpen={optionsDialogOpen}
        onClose={() => setOptionsDialogOpen(false)}
        tab={selectedTab}
        onRename={handleTabRename}
        onDelete={onDeleteTab}
        canDelete={tabs.length > 1}
      />
    </>
  )
}
