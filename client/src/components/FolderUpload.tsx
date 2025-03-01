
import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderUp } from "lucide-react";

interface FolderUploadProps {
  courseId: number;
  onSuccess: () => void;
}

export function FolderUpload({ courseId, onSuccess }: FolderUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFileCount(e.target.files.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileInputRef.current?.files?.length) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      
      // Append all files to the formData
      Array.from(fileInputRef.current.files).forEach(file => {
        formData.append("files", file);
      });
      
      const response = await fetch(`/api/courses/${courseId}/upload-folder`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const result = await response.json();
      
      toast({
        title: "Files uploaded successfully",
        description: `Uploaded ${result.count} files`,
      });
      
      setFileCount(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Learning Materials</CardTitle>
        <CardDescription>
          Upload a folder of your learning materials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label htmlFor="files" className="text-sm font-medium">
              Select files
            </label>
            <input
              ref={fileInputRef}
              id="files"
              type="file"
              multiple
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              onChange={handleFileChange}
            />
            {fileCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {fileCount} files selected
              </p>
            )}
          </div>
          
          <Button type="submit" disabled={isUploading || fileCount === 0} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FolderUp className="mr-2 h-4 w-4" />
                Upload Materials
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
