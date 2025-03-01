import { StudyTask } from "@shared/schema";

export function formatTasksForCalendar(tasks: StudyTask[]) {
  return tasks.map(task => ({
    id: task.id,
    title: `Study Task ${task.id}`,
    start: new Date(task.dueDate),
    end: new Date(task.dueDate),
    completed: task.completed
  }));
}

export function getCalendarRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}
