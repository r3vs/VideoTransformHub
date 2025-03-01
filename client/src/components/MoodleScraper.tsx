import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface HealthCheckResponse {
  status: string;
  service: string;
}

interface MoodleScrapingResponse {
  status: string;
  message: string;
  courses?: Array<{
    id: string;
    name: string;
    url: string;
    materials?: Array<{
      type: string;
      name: string;
      file?: string;
      url: string;
    }>;
    deadlines?: Array<{
      type: string;
      name: string;
      deadline: string;
      url: string;
    }>;
  }>;
}

const moodleFormSchema = z.object({
  moodleUrl: z.string().url("Please enter a valid Moodle URL"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  autoLogin: z.boolean().default(true)
});

type MoodleFormValues = z.infer<typeof moodleFormSchema>;

interface MoodleScraperProps {
  courseId: number;
  onSuccess: () => void;
}

export function MoodleScraper({ courseId, onSuccess }: MoodleScraperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedCount, setScrapedCount] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<MoodleFormValues>({
    resolver: zodResolver(moodleFormSchema),
    defaultValues: {
      moodleUrl: "",
      username: "",
      password: "",
      autoLogin: true // Always require credentials
    }
  });

  async function onSubmit(data: MoodleFormValues) {
    setIsLoading(true);
    setScrapedCount(null);

    try {
      // First check if the Python service is available
      const healthCheck = await apiRequest<HealthCheckResponse>("GET", `/api/python-bridge/health`);

      if (healthCheck?.status === "ok") {
        // Use Python scraper
        const response = await apiRequest<MoodleScrapingResponse>("POST", `/api/python-bridge/scrape-moodle`, {
          moodleUrl: data.moodleUrl,
          courseId: courseId,
          username: data.username,
          password: data.password
        });

        // Count all materials and deadlines
        const materialsCount = response.courses?.reduce((acc, course) => {
          return acc + (course.materials?.length || 0) + (course.deadlines?.length || 0);
        }, 0) || 0;

        setScrapedCount(materialsCount);

        toast({
          title: "Scraping completed successfully",
          description: `Imported ${materialsCount} items from Moodle`
        });
      } else {
        // Fallback to Gemini analysis
        const response = await apiRequest<{ count: number }>(
          "POST", 
          `/api/courses/${courseId}/scrape-moodle`, 
          {
            moodleUrl: data.moodleUrl,
            username: data.username,
            password: data.password
          }
        );

        const materialsCount = response.count || 0;
        setScrapedCount(materialsCount);

        toast({
          title: "Scraping completed successfully",
          description: `Imported ${materialsCount} materials from Moodle`
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error during scraping:", error);

      toast({
        title: "Error during scraping",
        description: "Unable to import materials from Moodle",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Moodle</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="moodleUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moodle Course URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://moodle.example.com/course/view.php?id=123" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the complete URL of the Moodle course page
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Moodle username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Moodle password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Materials"
              )}
            </Button>

            {scrapedCount !== null && (
              <div className="mt-4">
                <Badge variant="outline" className="bg-primary/10">
                  {scrapedCount} materials imported
                </Badge>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}