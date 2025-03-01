import { useEffect, useState } from "react";
import { Material } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractKeyPoints } from "@/lib/gemini";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaterialViewerProps {
  material: Material;
}

export function MaterialViewer({ material }: MaterialViewerProps) {
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  useEffect(() => {
    if (material.analysis) {
      setKeyPoints(extractKeyPoints(material));
    }
  }, [material]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Material Content</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              {material.type === "text" ? (
                <div className="prose max-w-none">{material.content}</div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  {material.type === "pdf" ? (
                    <iframe
                      src={material.content}
                      className="w-full h-full"
                      title="PDF Viewer"
                    />
                  ) : (
                    <video
                      src={material.content}
                      controls
                      className="max-w-full max-h-full"
                    />
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis">
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Key Points</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
                <h3 className="text-lg font-semibold mt-6">Detailed Analysis</h3>
                <div className="prose max-w-none">
                  {material.analysis}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="summary">
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              <div className="prose max-w-none">
                {material.summary}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
