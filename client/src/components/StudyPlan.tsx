import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStudyPlanSchema, insertStudyTaskSchema, type StudyPlan as StudyPlanType, type StudyTask } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudyPlanProps {
  courseId: number;
  onPlanCreated: () => void;
}

export function StudyPlan({ courseId, onPlanCreated }: StudyPlanProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const { toast } = useToast();

  const planForm = useForm({
    resolver: zodResolver(insertStudyPlanSchema),
    defaultValues: {
      courseId,
      title: "",
      startDate: new Date(),
      endDate: new Date()
    }
  });

  const taskForm = useForm({
    resolver: zodResolver(insertStudyTaskSchema),
    defaultValues: {
      materialId: 0,
      dueDate: new Date()
    }
  });

  const onSubmitPlan = async (data: any) => {
    try {
      const plan = await apiRequest("POST", "/api/study-plans", {
        ...data,
        courseId
      });

      toast({
        title: "Study plan created",
        description: "You can now add study tasks"
      });

      onPlanCreated();
      setShowTaskForm(true);
    } catch (error) {
      toast({
        title: "Failed to create study plan",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const onSubmitTask = async (data: any) => {
    try {
      await apiRequest("POST", `/api/study-plans/${data.planId}/tasks`, data);

      toast({
        title: "Study task added",
        description: "Task has been scheduled"
      });

      taskForm.reset();
    } catch (error) {
      toast({
        title: "Failed to add task",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Study Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter plan title" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={planForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <FormField
                  control={planForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < planForm.getValues("startDate")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {showTaskForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Study Task</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...taskForm}>
              <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
                <FormField
                  control={taskForm.control}
                  name="materialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Material ID" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
