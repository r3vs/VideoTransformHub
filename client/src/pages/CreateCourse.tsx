import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCourseSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

// Create a new schema without userId
const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  moodleUrl: z.string().url().optional().nullable().or(z.literal(""))
});

type CourseFormData = z.infer<typeof courseFormSchema>;

export default function CreateCourse() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      moodleUrl: ""
    }
  });

  const onSubmit = async (data: CourseFormData) => {
    try {
      // Prepare course data in the correct format
      const courseData = {
        title: data.title,
        description: data.description || null,
        moodleUrl: data.moodleUrl || null
      };

      console.log("Submitting course data:", courseData); // Debug log

      // Use the correct schema for the API
      const response = await apiRequest("POST", "/api/courses", courseData);

      console.log("API Response:", response); // Debug log

      toast({
        title: "Course created",
        description: "You'll be redirected to the dashboard"
      });

      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    } catch (error) {
      console.error("Error creating course:", error);

      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Course</CardTitle>
          <CardDescription>
            Add a new course to your learning platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter course title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field: { value, ...field }}) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter course description"
                        className="min-h-[100px]"
                        value={value || ""} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moodleUrl"
                render={({ field: { value, ...field }}) => (
                  <FormItem>
                    <FormLabel>Moodle URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://moodle.example.com/course/123" 
                        value={value || ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Create Course
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}