'use client';

import React from 'react';
import { ArweaveFileUploader } from './arweave-file-uploader';

export function ArweaveUploadExample() {
  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Arweave File Upload Example
        </h1>
        
        <div className="space-y-8">
          {/* Single File Upload */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Single File Upload</h2>
            <ArweaveFileUploader
              privateKey={process.env.NEXT_PUBLIC_ARWEAVE_KEY}
              onUploadComplete={handleUploadComplete}
              maxFileSize={10 * 1024 * 1024} // 10MB
              accept="image/*,application/pdf,.doc,.docx"
            />
          </div>

          {/* Multiple File Upload */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Multiple File Upload</h2>
            <ArweaveFileUploader
              privateKey={process.env.NEXT_PUBLIC_ARWEAVE_KEY}
              onUploadComplete={handleUploadComplete}
              multiple={true}
              maxFileSize={5 * 1024 * 1024} // 5MB per file
              defaultTags={[
                { name: 'App-Name', value: 'TradeTheNews' },
                { name: 'Content-Type', value: 'application/octet-stream' },
              ]}
            />
          </div>

          {/* Unauthenticated Upload (will show error) */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Unauthenticated Upload (Demo)</h2>
            <ArweaveFileUploader
              onUploadComplete={handleUploadComplete}
              maxFileSize={1 * 1024 * 1024} // 1MB
            />
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Set your Arweave private key in environment variables as <code>NEXT_PUBLIC_ARWEAVE_KEY</code></li>
            <li>Make sure you have AR tokens in your wallet for upload fees</li>
            <li>Files are uploaded to the Arweave decentralized storage network</li>
            <li>Each upload gets a unique transaction ID and permanent URL</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
