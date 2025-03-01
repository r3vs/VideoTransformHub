import { useQuery } from "@tanstack/react-query";
import { type Course, type StudyPlan } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyCalendar } from "@/components/StudyCalendar";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Book, Calendar, Plus } from "lucide-react";

export default function Dashboard() {
  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"]
  });

  const { data: studyPlans } = useQuery<StudyPlan[]>({
    queryKey: ["/api/study-plans"]
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses?.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="flex items-center p-4 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer">
                    <Book className="h-6 w-6 mr-3" />
                    <div>
                      <h3 className="font-medium">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}

              {!courses?.length && (
                <div className="text-center text-muted-foreground py-8">
                  No courses yet. Create your first course to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Study Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studyPlans?.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                >
                  <div className="flex items-center">
                    <Calendar className="h-6 w-6 mr-3" />
                    <div>
                      <h3 className="font-medium">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={plan.completed ? "secondary" : "default"}
                    size="sm"
                  >
                    {plan.completed ? "Completed" : "In Progress"}
                  </Button>
                </div>
              ))}

              {!studyPlans?.length && (
                <div className="text-center text-muted-foreground py-8">
                  No active study plans. Create one from a course page!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          {studyPlans?.length ? (
            <StudyCalendar
              tasks={[]} // TODO: Fetch tasks for active plans
              onDateSelect={(date) => {
                console.log("Selected date:", date);
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
