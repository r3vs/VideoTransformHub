import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type Course, type Material } from "@shared/schema";
import { ContentUpload } from "@/components/ContentUpload";
import { MaterialViewer } from "@/components/MaterialViewer";
import { StudyPlan } from "@/components/StudyPlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Upload, Link } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";


export default function Course() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id);
  const { toast } = useToast();

  const { data: course } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json();
    }
  });

  const { data: materials, refetch: refetchMaterials } = useQuery<Material[]>({
    queryKey: [`/api/courses/${courseId}/materials`],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/materials`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      return response.json();
    }
  });

  const [isScraping, setIsScraping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadSuccess = () => {
    toast({
      title: "Content uploaded",
      description: "Your content will be analyzed shortly"
    });
    refetchMaterials();
  };

  const handlePlanCreated = () => {
    toast({
      title: "Study plan created",
      description: "You can now start adding tasks"
    });
  };

  const handleMoodleScrape = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsScraping(true);

    const formData = new FormData(event.currentTarget);
    try {
      const res = await fetch(`/api/courses/${courseId}/moodle`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to scrape course');

      toast({
        title: "Success",
        description: "Course materials have been scraped and analyzed"
      });

      refetchMaterials();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scrape course materials",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setIsUploading(true);

    const formData = new FormData();
    Array.from(event.target.files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await fetch(`/api/courses/${courseId}/materials/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to upload files');

      toast({
        title: "Success",
        description: "Materials uploaded successfully"
      });

      refetchMaterials();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload materials",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!course) return null;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{course.title}</h1>
      {course.description && (
        <p className="text-muted-foreground mb-6">{course.description}</p>
      )}

      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="materials">Course Materials</TabsTrigger>
          <TabsTrigger value="study-plan">Study Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Moodle Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMoodleScrape} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="moodle_url">Moodle Course URL</Label>
                      <Input
                        id="moodle_url"
                        name="moodle_url"
                        type="url"
                        placeholder="https://moodle.example.com/course/view.php?id=123"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Moodle Username</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Moodle Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isScraping}>
                      <Link className="mr-2 h-4 w-4" />
                      {isScraping ? "Scraping..." : "Scrape from Moodle"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="text-sm text-muted-foreground">
                        Uploading materials...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <ContentUpload
                courseId={courseId}
                onUpload={handleUploadSuccess}
              />
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Available Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {materials?.map((material) => (
                      <div
                        key={material.id}
                        className="p-4 rounded-lg bg-secondary cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          // TODO: Select material for viewing
                        }}
                      >
                        <h3 className="font-medium">
                          Material #{material.id} ({material.type})
                        </h3>
                        {material.summary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {material.summary.slice(0, 100)}...
                          </p>
                        )}
                      </div>
                    ))}

                    {!materials?.length && (
                      <div className="text-center text-muted-foreground py-8">
                        No materials uploaded yet. Start by uploading some content!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              {materials?.[0] && <MaterialViewer material={materials[0]} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="study-plan">
          <StudyPlan
            courseId={courseId}
            onPlanCreated={handlePlanCreated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}