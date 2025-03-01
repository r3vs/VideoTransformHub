import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Course, Material } from "@shared/schema";
import MoodleScraper from "../components/MoodleScraper";
import ContentUpload from "../components/ContentUpload";
import StudyPlan from "../components/StudyPlan";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/use-toast";

export default function CoursePage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const { toast } = useToast();

  const { data: course, isLoading: isLoadingCourse } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json();
    }
  });

  const { data: materials, refetch: refetchMaterials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: [`/api/courses/${courseId}/materials`],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/materials`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      return response.json();
    }
  });

  const handleRefreshMaterials = () => {
    refetchMaterials();
  };

  if (isLoadingCourse) {
    return <div className="py-10 text-center">Caricamento corso...</div>;
  }

  if (!course) {
    return <div className="py-10 text-center">Corso non trovato</div>;
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">{course.title}</h1>
      {course.description && (
        <p className="text-muted-foreground mb-6">{course.description}</p>
      )}

      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="materials">Materiali</TabsTrigger>
          <TabsTrigger value="study-plan">Piano di Studio</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <MoodleScraper 
                courseId={courseId || ""} 
                onScrapingSuccess={handleRefreshMaterials} 
              />

              <ContentUpload 
                courseId={courseId || ""} 
                onUploadSuccess={handleRefreshMaterials} 
              />
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Materiali del Corso</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMaterials ? (
                    <div className="text-center py-4">Caricamento materiali...</div>
                  ) : !materials || materials.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nessun materiale disponibile. Carica dei file o avvia lo scraping Moodle.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {materials.map((material) => (
                        <li 
                          key={material.id}
                          className="p-3 border rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">
                                {material.content.split('/').pop() || material.content}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {material.summary || "Nessun sommario disponibile"}
                              </div>
                            </div>
                            <Badge variant={material.type === 'video' ? 'default' : 'outline'}>
                              {material.type}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="study-plan">
          <StudyPlan 
            courseId={parseInt(courseId || "0")} 
            onPlanCreated={handleRefreshMaterials} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}