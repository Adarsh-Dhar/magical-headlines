# Arweave Upload Hook

A React hook for uploading files to the Arweave decentralized storage network using the `@ardrive/turbo-sdk`.

## Features

- ✅ Single and multiple file uploads
- ✅ Real-time upload progress tracking
- ✅ Custom metadata tags support
- ✅ Error handling and retry logic
- ✅ TypeScript support
- ✅ Tailwind CSS styling
- ✅ Authentication with Arweave private keys

## Installation

```bash
pnpm add @ardrive/turbo-sdk
```

## Basic Usage

### 1. Simple File Upload

```tsx
import { useArweaveUpload } from '@/hooks/use-arweave-upload';

function MyComponent() {
  const { uploadFile, uploading, uploadProgress, lastUploadResult, error } = useArweaveUpload({
    privateKey: process.env.NEXT_PUBLIC_ARWEAVE_KEY,
  });

  const handleFileUpload = async (file: File) => {
    const result = await uploadFile(file);
    if (result.success) {
      console.log('Upload successful:', result.url);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => handleFileUpload(e.target.files[0])} 
      />
      {uploading && <div>Uploading... {uploadProgress}%</div>}
      {error && <div>Error: {error}</div>}
      {lastUploadResult?.success && (
        <div>
          <p>Upload successful!</p>
          <a href={lastUploadResult.url} target="_blank" rel="noopener noreferrer">
            View on Arweave
          </a>
        </div>
      )}
    </div>
  );
}
```

### 2. Multiple File Upload

```tsx
import { useArweaveUpload } from '@/hooks/use-arweave-upload';

function MyComponent() {
  const { uploadFiles, uploading, uploadProgress, lastUploadResult, error } = useArweaveUpload({
    privateKey: process.env.NEXT_PUBLIC_ARWEAVE_KEY,
    defaultTags: [
      { name: 'App-Name', value: 'MyApp' },
      { name: 'Content-Type', value: 'application/octet-stream' },
    ],
  });

  const handleMultipleUpload = async (files: File[]) => {
    const results = await uploadFiles(files);
    console.log('Upload results:', results);
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        onChange={(e) => handleMultipleUpload(Array.from(e.target.files))} 
      />
      {uploading && <div>Uploading... {uploadProgress}%</div>}
    </div>
  );
}
```

### 3. Using the Pre-built Component

```tsx
import { ArweaveFileUploader } from '@/components/arweave-file-uploader';

function MyPage() {
  return (
    <ArweaveFileUploader
      privateKey={process.env.NEXT_PUBLIC_ARWEAVE_KEY}
      onUploadComplete={(result) => console.log('Upload completed:', result)}
      multiple={true}
      maxFileSize={10 * 1024 * 1024} // 10MB
      accept="image/*,application/pdf"
      defaultTags={[
        { name: 'App-Name', value: 'MyApp' },
        { name: 'Version', value: '1.0.0' },
      ]}
    />
  );
}
```

## API Reference

### `useArweaveUpload(options)`

#### Options

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `privateKey` | `string` | Yes | Arweave private key (JWK format) |
| `defaultTags` | `Array<{name: string, value: string}>` | No | Default tags to add to all uploads |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `uploadFile` | `(file: File, customTags?) => Promise<UploadResult>` | Upload a single file |
| `uploadFiles` | `(files: File[], customTags?) => Promise<UploadResult[]>` | Upload multiple files |
| `uploading` | `boolean` | Whether an upload is in progress |
| `uploadProgress` | `number` | Upload progress percentage (0-100) |
| `lastUploadResult` | `UploadResult \| null` | Result of the last upload |
| `error` | `string \| null` | Current error message |
| `reset` | `() => void` | Reset all state |

### `UploadResult`

```typescript
interface UploadResult {
  id: string;        // Arweave transaction ID
  url: string;       // Permanent URL to access the file
  success: boolean;  // Whether upload was successful
  error?: string;    // Error message if upload failed
}
```

### `ArweaveFileUploader` Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `privateKey` | `string` | Yes | Arweave private key |
| `onUploadComplete` | `(result: any) => void` | No | Callback when upload completes |
| `multiple` | `boolean` | No | Allow multiple file selection |
| `accept` | `string` | No | File types to accept |
| `maxFileSize` | `number` | No | Maximum file size in bytes |
| `defaultTags` | `Array<{name: string, value: string}>` | No | Default tags for uploads |

## Environment Setup

1. **Install the package:**
   ```bash
   pnpm add @ardrive/turbo-sdk
   ```

2. **Set up environment variables:**
   ```env
   NEXT_PUBLIC_ARWEAVE_KEY=your_arweave_private_key_here
   ```

3. **Get an Arweave private key:**
   - Generate a new wallet at [arweave.app](https://arweave.app)
   - Export your private key (JWK format)
   - Add it to your environment variables

## Error Handling

The hook provides comprehensive error handling:

- **File validation errors**: Missing files, invalid file types
- **Authentication errors**: Invalid private key format
- **Upload errors**: Network issues, insufficient funds
- **Progress tracking**: Real-time upload progress

## Examples

### Custom Tags

```tsx
const customTags = [
  { name: 'App-Name', value: 'TradeTheNews' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Version', value: '1.0.0' },
  { name: 'Author', value: 'Your Name' },
];

const result = await uploadFile(file, customTags);
```

### Progress Tracking

```tsx
const { uploadFile, uploading, uploadProgress } = useArweaveUpload({
  privateKey: process.env.NEXT_PUBLIC_ARWEAVE_KEY,
});

return (
  <div>
    {uploading && (
      <div>
        <div>Uploading... {uploadProgress}%</div>
        <progress value={uploadProgress} max={100} />
      </div>
    )}
  </div>
);
```

### Error Handling

```tsx
const { uploadFile, error, reset } = useArweaveUpload({
  privateKey: process.env.NEXT_PUBLIC_ARWEAVE_KEY,
});

const handleUpload = async (file: File) => {
  const result = await uploadFile(file);
  
  if (!result.success) {
    console.error('Upload failed:', result.error);
    // Handle error (show toast, retry, etc.)
  }
};

return (
  <div>
    {error && (
      <div className="error">
        Error: {error}
        <button onClick={reset}>Clear Error</button>
      </div>
    )}
  </div>
);
```

## Notes

- **Authentication Required**: File uploads require a valid Arweave private key
- **Transaction Fees**: Each upload costs AR tokens (very small amounts)
- **Permanent Storage**: Files uploaded to Arweave are permanently stored
- **File Size Limits**: No hard limits, but larger files cost more AR
- **Content Types**: Arweave supports any file type

## Troubleshooting

### Common Issues

1. **"Private key is required"**: Make sure you've provided a valid Arweave private key
2. **"A JWK must be provided"**: Ensure your private key is in JWK format
3. **Upload fails**: Check your AR balance and network connection
4. **Progress not updating**: The hook uses real-time progress from the Turbo SDK

### Getting Help

- Check the [Arweave documentation](https://docs.arweave.org)
- Visit the [ArDrive Turbo SDK docs](https://docs.ardrive.io/docs/turbo/turbo-sdk)
- Join the [Arweave Discord](https://discord.gg/arweave)
