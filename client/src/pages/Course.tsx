import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type Course, type Material } from "@shared/schema";
import { ContentUpload } from "@/components/ContentUpload";
import { MaterialViewer } from "@/components/MaterialViewer";
import { StudyPlan } from "@/components/StudyPlan";
import { MoodleScraper } from "@/components/MoodleScraper";
import { FolderUpload } from "@/components/FolderUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Course() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id);
  const { toast } = useToast();

  const { data: course } = useQuery<Course>({
    queryKey: [`/api/courses/${courseId}`]
  });

  const { data: materials, refetch: refetchMaterials } = useQuery<Material[]>({
    queryKey: [`/api/courses/${courseId}/materials`]
  });

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <ContentUpload
                courseId={courseId}
                onUpload={handleUploadSuccess}
              />
            </div>
            <div>
              <MoodleScraper
                courseId={courseId}
                onSuccess={handleUploadSuccess}
              />
            </div>
            <div>
              <FolderUpload
                courseId={courseId}
                onSuccess={handleUploadSuccess}
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
