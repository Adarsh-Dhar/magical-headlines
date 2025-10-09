import { useState, useCallback } from 'react';
import { TurboFactory, ArweaveSigner } from '@ardrive/turbo-sdk';

interface UploadResult {
  id: string;
  url: string;
  success: boolean;
  error?: string;
}

interface UseArweaveUploadOptions {
  privateKey?: string;
  defaultTags?: Array<{ name: string; value: string }>;
}

interface UseArweaveUploadReturn {
  uploadFile: (file: File, customTags?: Array<{ name: string; value: string }>) => Promise<UploadResult>;
  uploadFiles: (files: File[], customTags?: Array<{ name: string; value: string }>) => Promise<UploadResult[]>;
  uploading: boolean;
  uploadProgress: number;
  lastUploadResult: UploadResult | null;
  error: string | null;
  reset: () => void;
}

export function useArweaveUpload(options: UseArweaveUploadOptions = {}): UseArweaveUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadResult, setLastUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { privateKey, defaultTags = [] } = options;

  const uploadFile = useCallback(async (
    file: File, 
    customTags: Array<{ name: string; value: string }> = []
  ): Promise<UploadResult> => {
    if (!file) {
      const errorMsg = 'No file provided';
      setError(errorMsg);
      return { id: '', url: '', success: false, error: errorMsg };
    }

    if (!privateKey) {
      const errorMsg = 'Private key is required for file uploads';
      setError(errorMsg);
      return { id: '', url: '', success: false, error: errorMsg };
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create signer with private key
      const signer = new ArweaveSigner(JSON.parse(privateKey));
      const turbo = TurboFactory.authenticated({ signer });

      // Combine default tags with custom tags
      const allTags = [
        ...defaultTags,
        ...customTags,
        { name: 'Content-Type', value: file.type },
        { name: 'File-Name', value: file.name },
        { name: 'File-Size', value: file.size.toString() },
        { name: 'Upload-Timestamp', value: Date.now().toString() },
      ];

      const result = await turbo.uploadFile({
        fileStreamFactory: () => file.stream(),
        fileSizeFactory: () => file.size,
        events: {
          onProgress: ({ totalBytes, processedBytes }: { totalBytes: number; processedBytes: number }) => {
            const progress = Math.round((processedBytes / totalBytes) * 100);
            setUploadProgress(progress);
          },
          onError: (error: Error) => {
            console.error('Upload error:', error);
          },
        },
        dataItemOpts: {
          tags: allTags,
        },
      });

      setUploadProgress(100);

      const uploadResult: UploadResult = {
        id: result.id,
        url: `https://arweave.net/${result.id}`,
        success: true,
      };

      setLastUploadResult(uploadResult);
      return uploadResult;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      const errorResult: UploadResult = {
        id: '',
        url: '',
        success: false,
        error: errorMsg,
      };
      setLastUploadResult(errorResult);
      return errorResult;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [privateKey, defaultTags]);

  const uploadFiles = useCallback(async (
    files: File[], 
    customTags: Array<{ name: string; value: string }> = []
  ): Promise<UploadResult[]> => {
    if (!files.length) {
      const errorMsg = 'No files provided';
      setError(errorMsg);
      return [];
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const results: UploadResult[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        setUploadProgress(progress);

        const result = await uploadFile(file, customTags);
        results.push(result);

        // If any upload fails, we might want to stop or continue
        if (!result.success) {
          console.warn(`Upload failed for file: ${file.name}`, result.error);
        }
      }

      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Batch upload failed';
      setError(errorMsg);
      return results;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [uploadFile]);

  const reset = useCallback(() => {
    setUploading(false);
    setUploadProgress(0);
    setLastUploadResult(null);
    setError(null);
  }, []);

  return {
    uploadFile,
    uploadFiles,
    uploading,
    uploadProgress,
    lastUploadResult,
    error,
    reset,
  };
}

// Convenience hook for authenticated uploads
export function useAuthenticatedArweaveUpload(privateKey: string, defaultTags?: Array<{ name: string; value: string }>) {
  return useArweaveUpload({ privateKey, defaultTags });
}

// Convenience hook for unauthenticated uploads
export function useUnauthenticatedArweaveUpload(defaultTags?: Array<{ name: string; value: string }>) {
  return useArweaveUpload({ defaultTags });
}
