
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const moodleScraperSchema = z.object({
  moodleUrl: z.string().url({ message: "Please enter a valid Moodle URL" }),
  username: z.string().optional(),
  password: z.string().optional(),
});

type MoodleScraperValues = z.infer<typeof moodleScraperSchema>;

interface MoodleScraperProps {
  courseId: number;
  onSuccess: () => void;
}

export function MoodleScraper({ courseId, onSuccess }: MoodleScraperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<MoodleScraperValues>({
    resolver: zodResolver(moodleScraperSchema),
    defaultValues: {
      moodleUrl: "",
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: MoodleScraperValues) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/scrape-moodle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to scrape Moodle content");
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Imported ${result.count} materials from Moodle`,
      });
      
      onSuccess();
    } catch (error) {
      console.error("Moodle scraping error:", error);
      toast({
        title: "Scraping failed",
        description: error.message || "Please check the URL and credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from Moodle</CardTitle>
        <CardDescription>
          Scrape content from your Moodle course page
        </CardDescription>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username (optional)</FormLabel>
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
                  <FormLabel>Password (optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Moodle password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                "Import from Moodle"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
