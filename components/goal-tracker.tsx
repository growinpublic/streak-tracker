"use client";

import { useState, useEffect } from "react";
import { GoalForm } from "./goal-form";
import { StreakBar } from "./streak-bar";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  XCircle,
  CheckCircle,
} from "lucide-react";
import {
  type GoalRecord,
  getAllGoals,
  addGoal as dbAddGoal,
  deleteGoal as dbDeleteGoal,
  updateGoalProgress,
  updateGoalOrder,
  updateGoal as dbUpdateGoal,
} from "@/lib/db";
import { LoadingSpinner } from "./loading-spinner";
import { ImportExport } from "./import-export";
import { differenceInDays, addDays, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Goal {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: string[]; // Array of dates marked as completed (ISO strings)
  color: string;
  order: number;
}

function recordToGoal(record: GoalRecord): Goal {
  return {
    ...record,
    startDate: new Date(record.startDate),
    endDate: new Date(record.endDate),
    order: record.order || 0, // Default to 0 if order is not set
  };
}

function goalToRecord(goal: Goal): GoalRecord {
  return {
    ...goal,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    order: goal.order || 0, // Default to 0 if order is not set
  };
}

export function GoalTracker() {
  const [showForm, setShowForm] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the extend end date confirmation dialog
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendInfo, setExtendInfo] = useState<{
    goalId: string;
    newEndDate: string;
  } | null>(null);

  // Load goals from database
  const loadGoals = async () => {
    try {
      setLoading(true);
      const records = await getAllGoals();
      const loadedGoals = records.map(recordToGoal);

      // Sort goals by order
      loadedGoals.sort((a, b) => a.order - b.order);

      setGoals(loadedGoals);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load goals on component mount
  useEffect(() => {
    loadGoals();
  }, []);

  const addGoal = async (goal: Omit<Goal, "id" | "progress" | "order">) => {
    try {
      // Get the highest order value
      const highestOrder =
        goals.length > 0 ? Math.max(...goals.map((g) => g.order)) : -1;

      const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
        progress: [],
        order: highestOrder + 1, // Place new goal at the end
      };

      await dbAddGoal(goalToRecord(newGoal));

      // Update local state
      setGoals((prev) => [...prev, newGoal]);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add goal:", error);
    }
  };

  const updateProgress = async (goalId: string, date: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      // Toggle the date in progress
      const newProgress = goal.progress.includes(date)
        ? goal.progress.filter((d) => d !== date)
        : [...goal.progress, date];

      await updateGoalProgress(goalId, newProgress);

      // Update local state
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g))
      );
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await dbDeleteGoal(goalId);

      // Update local state
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  // New function to clear all progress for a goal
  const clearProgress = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      // Clear all progress
      await updateGoalProgress(goalId, []);

      // Update local state
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: [] } : g))
      );
    } catch (error) {
      console.error("Failed to clear progress:", error);
    }
  };

  // New function to fill all dates in the goal range
  const fillProgress = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      // Generate all dates in the range
      const startDate = new Date(goal.startDate);
      const endDate = new Date(goal.endDate);

      // Calculate total days in the goal range (inclusive)
      const totalDays = differenceInDays(endDate, startDate) + 1;

      // Generate array of all dates in the range
      const allDates: string[] = [];
      for (let i = 0; i < totalDays; i++) {
        const date = addDays(startDate, i);
        allDates.push(format(date, "yyyy-MM-dd"));
      }

      // Update progress with all dates
      await updateGoalProgress(goalId, allDates);

      // Update local state
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: allDates } : g))
      );
    } catch (error) {
      console.error("Failed to fill progress:", error);
    }
  };

  // Function to handle extending the end date
  const handleExtendEndDate = (goalId: string, dateStr: string) => {
    setExtendInfo({ goalId, newEndDate: dateStr });
    setExtendDialogOpen(true);
  };

  // Function to confirm and extend the end date
  const confirmExtendEndDate = async () => {
    if (!extendInfo) return;

    try {
      const { goalId, newEndDate } = extendInfo;
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      // Create updated goal with new end date
      const updatedGoal = {
        ...goal,
        endDate: new Date(newEndDate),
      };

      // Update in database
      await dbUpdateGoal(goalToRecord(updatedGoal));

      // Update local state
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));

      // Close dialog
      setExtendDialogOpen(false);
      setExtendInfo(null);
    } catch (error) {
      console.error("Failed to extend end date:", error);
    }
  };

  // New function to move a goal up or down
  const moveGoal = async (goalId: string, direction: "up" | "down") => {
    try {
      // Find the current goal and its index
      const currentIndex = goals.findIndex((g) => g.id === goalId);
      if (currentIndex === -1) return;

      // Calculate the target index
      const targetIndex =
        direction === "up"
          ? Math.max(0, currentIndex - 1)
          : Math.min(goals.length - 1, currentIndex + 1);

      // If already at the top/bottom, do nothing
      if (targetIndex === currentIndex) return;

      // Create a copy of the goals array for reordering
      const updatedGoals = [...goals];

      // Swap the goals
      const temp = updatedGoals[currentIndex];
      updatedGoals[currentIndex] = updatedGoals[targetIndex];
      updatedGoals[targetIndex] = temp;

      // Update the order property for all goals
      const reorderedGoals = updatedGoals.map((goal, index) => ({
        ...goal,
        order: index,
      }));

      // Update the database
      for (const goal of reorderedGoals) {
        await updateGoalOrder(goal.id, goal.order);
      }

      // Update the state
      setGoals(reorderedGoals);
    } catch (error) {
      console.error("Failed to reorder goals:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Goals</h2>
        <ImportExport onImportComplete={loadGoals} />
      </div>

      {goals.length > 0 ? (
        <div className="space-y-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="space-y-3 p-4 border rounded-lg border-border"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                    <h3 className="text-xl font-medium">{goal.title}</h3>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(goal.startDate).toLocaleDateString()} to{" "}
                    {new Date(goal.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveGoal(goal.id, "up")}
                      disabled={goals.indexOf(goal) === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveGoal(goal.id, "down")}
                      disabled={goals.indexOf(goal) === goals.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearProgress(goal.id)}
                      title="Clear all progress"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fillProgress(goal.id)}
                      title="Fill all dates"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Fill
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                      title="Delete this goal"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
              <StreakBar
                startDate={goal.startDate}
                endDate={goal.endDate}
                progress={goal.progress}
                color={goal.color}
                onDateClick={(date) => updateProgress(goal.id, date)}
                onExtendEndDate={(date) => handleExtendEndDate(goal.id, date)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg border-border">
          <p className="text-muted-foreground mb-4">
            No goals added yet. Add your first goal to get started!
          </p>
        </div>
      )}

      {showForm ? (
        <GoalForm onSubmit={addGoal} onCancel={() => setShowForm(false)} />
      ) : (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Goal
        </Button>
      )}

      {/* Confirmation Dialog for Extending End Date */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Goals End Date</DialogTitle>
            <DialogDescription>
              Do you want to extend this goals's end date to{" "}
              {extendInfo?.newEndDate
                ? new Date(extendInfo.newEndDate).toLocaleDateString()
                : ""}
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmExtendEndDate}>Extend End Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
