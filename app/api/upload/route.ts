import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const appName = formData.get('appName') as string || 'Untitled App';
    const version = formData.get('version') as string || '1.0.0';
    const existingShareId = formData.get('existingShareId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.apk')) {
      return NextResponse.json({ error: 'Only APK files are allowed' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    let uploadId: string;
    let isUpdate = false;
    let previousMetadata: any = null;
    let versionHistory: any[] = [];

    // Check if updating existing share
    if (existingShareId) {
      const existingDir = path.join(uploadsDir, existingShareId);
      if (existsSync(existingDir)) {
        const metadataPath = path.join(existingDir, 'metadata.json');
        if (existsSync(metadataPath)) {
          const existingMetadataContent = await readFile(metadataPath, 'utf-8');
          previousMetadata = JSON.parse(existingMetadataContent);
          uploadId = existingShareId;
          isUpdate = true;
          
          // Preserve version history if it exists
          if (previousMetadata.versionHistory) {
            versionHistory = previousMetadata.versionHistory;
          }
          
          // Add current version to history
          versionHistory.push({
            version: previousMetadata.version,
            fileName: previousMetadata.fileName,
            fileSize: previousMetadata.fileSize,
            uploadedAt: previousMetadata.uploadedAt,
          });

          // Delete old APK file
          const oldFilePath = path.join(existingDir, previousMetadata.fileName);
          if (existsSync(oldFilePath)) {
            await unlink(oldFilePath);
          }
        } else {
          return NextResponse.json({ error: 'Existing share metadata not found' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Existing share not found' }, { status: 404 });
      }
    } else {
      // Generate new unique ID
      uploadId = uuidv4();
    }

    const fileDir = path.join(uploadsDir, uploadId);

    // Create directories if they don't exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(fileDir)) {
      await mkdir(fileDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(fileDir, file.name);
    await writeFile(filePath, buffer);

    // Save metadata
    const metadata = {
      id: uploadId,
      fileName: file.name,
      appName,
      version,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
      isUpdate,
    };
    const metadataPath = path.join(fileDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      uploadId,
      shareUrl: `/share/${uploadId}`,
      metadata,
      isUpdate,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

