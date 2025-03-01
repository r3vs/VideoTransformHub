
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "./ui/use-toast";

interface MoodleScraperProps {
  courseId: string;
  onScrapingSuccess: () => void;
}

export default function MoodleScraper({ courseId, onScrapingSuccess }: MoodleScraperProps) {
  const [isScraping, setIsScraping] = useState(false);
  const [formData, setFormData] = useState({
    moodle_url: "",
    username: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.moodle_url || !formData.username || !formData.password) {
      toast({
        title: "Campi mancanti",
        description: "Completa tutti i campi richiesti",
        variant: "destructive"
      });
      return;
    }
    
    setIsScraping(true);
    
    try {
      const response = await fetch(`/api/courses/${courseId}/moodle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Errore durante lo scraping");
      }
      
      const data = await response.json();
      
      toast({
        title: "Scraping completato",
        description: `Recuperati ${data.materials?.length || 0} materiali dal corso Moodle`
      });
      
      onScrapingSuccess();
    } catch (error) {
      console.error("Moodle scraping error:", error);
      toast({
        title: "Errore di scraping",
        description: "Non è stato possibile recuperare i materiali da Moodle",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moodle Scraper</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moodle_url">URL del corso Moodle</Label>
            <Input
              id="moodle_url"
              name="moodle_url"
              type="url"
              placeholder="https://moodle.example.com/course/view.php?id=123"
              value={formData.moodle_url}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username Moodle</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="nome.cognome"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password Moodle</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <Button type="submit" disabled={isScraping} className="w-full">
            {isScraping ? "Elaborazione in corso..." : "Avvia Scraping"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
