#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ArweaveUploadResult {
  arweaveUrl: string;
  arweaveId: string;
  signature: string;
}

async function uploadToArweave(content: string): Promise<ArweaveUploadResult> {
  try {
    // Use the real Arweave upload API
    const response = await fetch('http://localhost:3000/api/arweave/upload', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Arweave upload failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
      arweaveUrl: result.arweaveUrl || result.url,
      arweaveId: result.arweaveId || result.id,
      signature: result.signature || result.txId
    };
  } catch (error) {
    console.error('Error uploading to Arweave:', error);
    throw new Error(`Failed to upload to Arweave: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fixPlaceholderStories() {
  try {
    console.log('🔍 Finding stories with placeholder Arweave URLs...');
    
    // Find all stories with placeholder URLs
    const placeholderStories = await prisma.story.findMany({
      where: {
        OR: [
          { arweaveUrl: 'https://arweave.net/placeholder' },
          { arweaveUrl: null },
          { arweaveUrl: '' }
        ]
      },
      include: {
        token: true
      }
    });

    console.log(`📊 Found ${placeholderStories.length} stories with placeholder URLs`);

    if (placeholderStories.length === 0) {
      console.log('✅ No placeholder stories found. All stories have real Arweave URLs.');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const story of placeholderStories) {
      try {
        console.log(`\n🔄 Processing story: ${story.headline}`);
        console.log(`   ID: ${story.id}`);
        console.log(`   Current URL: ${story.arweaveUrl || 'null'}`);

        // Fetch actual story content from database
        const storyContent = {
          headline: story.headline,
          content: story.content || `Story content for: ${story.headline}`,
          timestamp: story.createdAt.toISOString(),
          author: story.author,
          originalUrl: story.originalUrl,
          tags: story.tags || []
        };

        // Upload to Arweave
        console.log('   📤 Uploading to Arweave...');
        const arweaveResult = await uploadToArweave(JSON.stringify(storyContent));

        // Update the story with real Arweave data
        await prisma.story.update({
          where: { id: story.id },
          data: {
            arweaveUrl: arweaveResult.arweaveUrl,
            arweaveId: arweaveResult.arweaveId,
            onchainSignature: arweaveResult.signature
          }
        });

        console.log(`   ✅ Updated with Arweave URL: ${arweaveResult.arweaveUrl}`);

        processedCount++;

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ❌ Error processing story ${story.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`   ✅ Successfully processed: ${processedCount} stories`);
    console.log(`   ❌ Errors: ${errorCount} stories`);

  } catch (error) {
    console.error('❌ Failed to fix placeholder stories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyPlaceholdersFixed() {
  try {
    console.log('\n🔍 Verifying all placeholders are fixed...');
    
    const remainingPlaceholders = await prisma.story.count({
      where: {
        OR: [
          { arweaveUrl: 'https://arweave.net/placeholder' },
          { arweaveUrl: null },
          { arweaveUrl: '' }
        ]
      }
    });

    if (remainingPlaceholders === 0) {
      console.log('✅ All placeholders have been fixed!');
    } else {
      console.log(`⚠️  ${remainingPlaceholders} stories still have placeholder URLs`);
    }

    // Show summary of all stories
    const totalStories = await prisma.story.count();
    const storiesWithArweave = await prisma.story.count({
      where: {
        arweaveUrl: {
          not: null
        }
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total stories: ${totalStories}`);
    console.log(`   Stories with Arweave URLs: ${storiesWithArweave}`);
    console.log(`   Stories without Arweave URLs: ${totalStories - storiesWithArweave}`);

  } catch (error) {
    console.error('❌ Error verifying placeholders:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting placeholder fix script...');
  
  await fixPlaceholderStories();
  await verifyPlaceholdersFixed();
  
  console.log('\n🏁 Script completed!');
}

main().catch(console.error);
