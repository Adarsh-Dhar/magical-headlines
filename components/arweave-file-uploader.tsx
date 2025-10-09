'use client';

import React, { useState } from 'react';
import { useArweaveUpload } from '@/hooks/use-arweave-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Upload, FileText } from 'lucide-react';

interface ArweaveFileUploaderProps {
  privateKey?: string;
  defaultTags?: Array<{ name: string; value: string }>;
  onUploadComplete?: (result: any) => void;
  multiple?: boolean;
  accept?: string;
  maxFileSize?: number; // in bytes
}

export function ArweaveFileUploader({
  privateKey,
  defaultTags = [],
  onUploadComplete,
  multiple = false,
  accept,
  maxFileSize,
}: ArweaveFileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customTags, setCustomTags] = useState<Array<{ name: string; value: string }>>([]);
  const [tagName, setTagName] = useState('');
  const [tagValue, setTagValue] = useState('');

  const {
    uploadFile,
    uploadFiles,
    uploading,
    uploadProgress,
    lastUploadResult,
    error,
    reset,
  } = useArweaveUpload({ privateKey, defaultTags });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Filter by file size if maxFileSize is specified
    const validFiles = maxFileSize 
      ? files.filter(file => file.size <= maxFileSize)
      : files;
    
    setSelectedFiles(validFiles);
    reset(); // Clear previous results
  };

  const handleSingleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    const result = await uploadFile(selectedFiles[0], customTags);
    onUploadComplete?.(result);
  };

  const handleMultipleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    const results = await uploadFiles(selectedFiles, customTags);
    onUploadComplete?.(results);
  };

  const addCustomTag = () => {
    if (tagName.trim() && tagValue.trim()) {
      setCustomTags(prev => [...prev, { name: tagName.trim(), value: tagValue.trim() }]);
      setTagName('');
      setTagValue('');
    }
  };

  const removeCustomTag = (index: number) => {
    setCustomTags(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Arweave File Uploader
          </CardTitle>
          <CardDescription>
            Upload files to the Arweave decentralized storage network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Input
              type="file"
              onChange={handleFileSelect}
              multiple={multiple}
              accept={accept}
              className="cursor-pointer"
            />
            {maxFileSize && (
              <p className="text-sm text-muted-foreground">
                Max file size: {formatFileSize(maxFileSize)}
              </p>
            )}
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Files:</h4>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{file.name}</span>
                    <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tags */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Custom Tags (Optional):</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Tag value"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addCustomTag} size="sm" variant="outline">
                Add
              </Button>
            </div>
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customTags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeCustomTag(index)}
                  >
                    {tag.name}: {tag.value} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Buttons */}
          <div className="flex gap-2">
            {multiple ? (
              <Button
                onClick={handleMultipleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
              </Button>
            ) : (
              <Button
                onClick={handleSingleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            )}
            <Button
              onClick={reset}
              variant="outline"
              disabled={uploading}
            >
              Reset
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {lastUploadResult && lastUploadResult.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Upload successful!</p>
                  <p className="text-sm">
                    <strong>Transaction ID:</strong> {lastUploadResult.id}
                  </p>
                  <p className="text-sm">
                    <strong>Access URL:</strong>{' '}
                    <a
                      href={lastUploadResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {lastUploadResult.url}
                    </a>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
