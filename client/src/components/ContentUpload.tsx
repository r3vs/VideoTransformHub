
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "./ui/use-toast";
import { Upload, ChevronUp, ChevronDown, File as FileIcon } from "lucide-react";

interface ContentUploadProps {
  courseId: string;
  onUploadSuccess: () => void;
}

export default function ContentUpload({ courseId, onUploadSuccess }: ContentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showFileList, setShowFileList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona almeno un file da caricare",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/courses/${courseId}/materials/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore durante il caricamento dei file');
      }

      toast({
        title: "Caricamento completato",
        description: `${selectedFiles.length} file caricati con successo`
      });

      setSelectedFiles([]);
      onUploadSuccess();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un errore durante il caricamento dei file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carica Materiali Didattici</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-500 mb-1">
            Trascina i file qui o clicca per selezionarli
          </p>
          <p className="text-xs text-gray-400">
            Supporta tutti i formati di file (PDF, DOC, PPT, video, immagini, ecc.)
          </p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                {selectedFiles.length} file selezionati
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileList(!showFileList)}
              >
                {showFileList ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showFileList && (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="flex items-center">
                      <FileIcon className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      &times;
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full"
        >
          {isUploading ? "Caricamento in corso..." : "Carica File"}
        </Button>
      </CardContent>
    </Card>
  );
}
