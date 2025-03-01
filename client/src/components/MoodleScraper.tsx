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

const moodleFormSchema = z.object({
  moodleUrl: z.string().url("Inserisci un URL valido"),
  username: z.string().optional(),
  password: z.string().optional(),
  autoLogin: z.boolean().default(false)
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
      autoLogin: false
    }
  });

  async function onSubmit(data: MoodleFormValues) {
    setIsLoading(true);
    setScrapedCount(null);

    try {
      // First check if the Python service is available
      const healthCheck = await apiRequest("GET", `/api/python-bridge/health`);

      if (healthCheck && healthCheck.available) {
        // Use Python scraper
        const response = await apiRequest("POST", `/api/python-bridge/scrape-moodle`, {
          moodleUrl: data.moodleUrl,
          courseId: courseId,
          username: data.username,
          password: data.password,
          autoLogin: data.autoLogin
        });

        const materialsCount = response.courses?.length || 0;
        setScrapedCount(materialsCount);

        toast({
          title: "Scraping completato con successo",
          description: `Sono stati importati ${materialsCount} corsi dal corso Moodle`
        });
      } else {
        // Fallback to original implementation
        const scraperData = {
          moodleUrl: data.moodleUrl,
          courseId: courseId
        };

        // Aggiungi credenziali solo se autoLogin è abilitato
        if (data.autoLogin && data.username && data.password) {
          Object.assign(scraperData, {
            username: data.username,
            password: data.password,
            autoLogin: true
          });
        }

        // Chiamata API per lo scraping
        const response = await apiRequest(
          "POST", 
          `/api/courses/${courseId}/scrape-moodle`, 
          scraperData
        );

        // Gestione risposta
        const materialsCount = response.count || 0;
        setScrapedCount(materialsCount);

        toast({
          title: "Scraping completato con successo",
          description: `Sono stati importati ${materialsCount} materiali dal corso Moodle`
        });
      }

      // Callback di successo
      onSuccess();
    } catch (error) {
      console.error("Errore durante lo scraping:", error);

      toast({
        title: "Errore durante lo scraping",
        description: "Non è stato possibile importare i materiali da Moodle",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importa da Moodle</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="moodleUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Corso Moodle</FormLabel>
                  <FormControl>
                    <Input placeholder="https://moodle.example.com/course/view.php?id=123" {...field} />
                  </FormControl>
                  <FormDescription>
                    Inserisci l'URL completo della pagina del corso Moodle
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoLogin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Usa credenziali per accesso
                    </FormLabel>
                    <FormDescription>
                      Attiva per fornire le credenziali di accesso a Moodle
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("autoLogin") && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username Moodle" {...field} />
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
                        <Input type="password" placeholder="Password Moodle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importazione in corso...
                </>
              ) : (
                "Importa Materiali"
              )}
            </Button>

            {scrapedCount !== null && (
              <div className="mt-4">
                <Badge variant="outline" className="bg-primary/10">
                  {scrapedCount} materiali importati
                </Badge>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}