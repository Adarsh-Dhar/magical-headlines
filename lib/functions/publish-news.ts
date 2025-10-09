import { useState } from 'react';

export interface NewsContent {
  title: string;
  content: string;
  summary?: string;
  author: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface PublishNewsOptions {
  walletAddress?: string;
  newsContent: NewsContent;
  customTags?: Array<{ name: string; value: string }>;
}

export interface PublishNewsResult {
  success: boolean;
  arweaveId?: string;
  arweaveUrl?: string;
  error?: string;
  newsId?: string;
}

/**
 * Publishes news content to Arweave using the server-side API
 * @param options - Configuration for publishing news
 * @returns Promise with the result of the news publication
 */
export async function publishNews(options: PublishNewsOptions): Promise<PublishNewsResult> {
  const { walletAddress, newsContent, customTags = [] } = options;

  try {
    // Create a JSON file with the news content
    const newsData = {
      ...newsContent,
      publishedAt: new Date().toISOString(),
      version: '1.0',
    };

    const content = JSON.stringify(newsData, null, 2);

    // Create default tags for news content
    const defaultNewsTags = [
      { name: 'News-Title', value: newsContent.title },
      { name: 'News-Author', value: newsContent.author },
      { name: 'News-Category', value: newsContent.category || 'general' },
      { name: 'News-Tags', value: newsContent.tags?.join(',') || '' },
      { name: 'Published-At', value: newsData.publishedAt },
    ];

    // Combine default tags with custom tags
    const allTags = [...defaultNewsTags, ...customTags];

    // Upload to Arweave via API
    const response = await fetch('/api/arweave/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        tags: allTags,
        walletAddress,
      }),
    });

    const uploadResult = await response.json();

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload news to Arweave',
      };
    }

    return {
      success: true,
      arweaveId: uploadResult.id,
      arweaveUrl: uploadResult.url,
      newsId: `news-${Date.now()}`,
    };

  } catch (error) {
    console.error('Error publishing news:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Hook for publishing news with reactive state management
 * @param walletAddress - Wallet address for tagging uploads
 * @param defaultTags - Default tags to include with all uploads
 * @returns Object with publish function and upload state
 */
export function usePublishNews(walletAddress?: string, defaultTags?: Array<{ name: string; value: string }>) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastUploadResult, setLastUploadResult] = useState<PublishNewsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publishNewsContent = async (newsContent: NewsContent, customTags?: Array<{ name: string; value: string }>, dynamicWalletAddress?: string) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Create a JSON file with the news content
      const newsData = {
        ...newsContent,
        publishedAt: new Date().toISOString(),
        version: '1.0',
      };

      const content = JSON.stringify(newsData, null, 2);

      // Create default tags for news content
      const defaultNewsTags = [
        { name: 'News-Title', value: newsContent.title },
        { name: 'News-Author', value: newsContent.author },
        { name: 'News-Category', value: newsContent.category || 'general' },
        { name: 'News-Tags', value: newsContent.tags?.join(',') || '' },
        { name: 'Published-At', value: newsData.publishedAt },
        ...(defaultTags || []),
      ];

      // Combine default tags with custom tags
      const allTags = [...defaultNewsTags, ...(customTags || [])];

      setUploadProgress(50);

      // Upload to Arweave via API
      const finalWalletAddress = dynamicWalletAddress || walletAddress;
      console.log('Publishing to Arweave with wallet address:', finalWalletAddress);
      
      const response = await fetch('/api/arweave/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          tags: allTags,
          walletAddress: finalWalletAddress,
        }),
      });

      setUploadProgress(100);

      const uploadResult = await response.json();

      if (!uploadResult.success) {
        const errorMsg = uploadResult.error || 'Failed to upload news to Arweave';
        setError(errorMsg);
        const errorResult = {
          success: false,
          error: errorMsg,
        };
        setLastUploadResult(errorResult);
        return errorResult;
      }

      const successResult = {
        success: true,
        arweaveId: uploadResult.id,
        arweaveUrl: uploadResult.url,
        newsId: `news-${Date.now()}`,
      };

      setLastUploadResult(successResult);
      return successResult;

    } catch (error) {
      console.error('Error publishing news:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMsg);
      const errorResult = {
        success: false,
        error: errorMsg,
      };
      setLastUploadResult(errorResult);
      return errorResult;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const reset = () => {
    setUploading(false);
    setUploadProgress(0);
    setLastUploadResult(null);
    setError(null);
  };

  return {
    publishNews: publishNewsContent,
    uploading,
    uploadProgress,
    lastUploadResult,
    error,
    reset,
  };
}

/**
 * Convenience function for publishing news with minimal configuration
 * @param walletAddress - Wallet address for tagging
 * @param title - News title
 * @param content - News content
 * @param author - News author
 * @param additionalOptions - Additional news options
 * @returns Promise with the result of the news publication
 */
export async function publishNewsSimple(
  walletAddress: string,
  title: string,
  content: string,
  author: string,
  additionalOptions?: Partial<NewsContent>
): Promise<PublishNewsResult> {
  const newsContent: NewsContent = {
    title,
    content,
    author,
    ...additionalOptions,
  };

  return publishNews({
    walletAddress,
    newsContent,
  });
}
