import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { StudyTask } from "@shared/schema";
import { formatTasksForCalendar, getCalendarRange } from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StudyCalendarProps {
  tasks: StudyTask[];
  onDateSelect: (date: Date) => void;
}

export function StudyCalendar({ tasks, onDateSelect }: StudyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const calendarTasks = formatTasksForCalendar(tasks);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect(date);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            components={{
              DayContent: ({ date }) => {
                const tasksForDay = calendarTasks.filter(
                  task => task.start.toDateString() === date.toDateString()
                );

                return (
                  <div className="relative w-full h-full">
                    <div>{date.getDate()}</div>
                    {tasksForDay.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-0 right-0 -mb-1 -mr-1"
                      >
                        {tasksForDay.length}
                      </Badge>
                    )}
                  </div>
                );
              }
            }}
          />

          <div className="space-y-2">
            <h3 className="font-medium">Tasks for {selectedDate.toLocaleDateString()}</h3>
            {calendarTasks
              .filter(task => task.start.toDateString() === selectedDate.toDateString())
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary"
                >
                  <span>{task.title}</span>
                  <Badge variant={task.completed ? "success" : "default"}>
                    {task.completed ? "Completed" : "Pending"}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
