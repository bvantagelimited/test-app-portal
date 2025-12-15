import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/auth';

// Supported app file extensions
const SUPPORTED_EXTENSIONS = ['.apk', '.ipa', '.aab', '.exe', '.dmg', '.pkg', '.msi', '.deb', '.rpm', '.appimage'];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

function getFileType(filename: string): string {
  const ext = getFileExtension(filename);
  const typeMap: Record<string, string> = {
    '.apk': 'Android',
    '.ipa': 'iOS',
    
  };
  return typeMap[ext] || 'App';
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email?.endsWith('@ipification.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const appName = formData.get('appName') as string || 'Untitled App';
    const version = formData.get('version') as string || '1.0.0';
    const packageName = formData.get('packageName') as string | null;
    const appIcon = formData.get('appIcon') as string | null;
    const existingShareId = formData.get('existingShareId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const fileExt = getFileExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ 
        error: `Unsupported file type. Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}` 
      }, { status: 400 });
    }

    const fileType = getFileType(file.name);

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
            uploadedBy: previousMetadata.uploadedBy,
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

    // Save metadata with uploader info
    const metadata = {
      id: uploadId,
      fileName: file.name,
      appName,
      packageName,
      version,
      fileSize: file.size,
      fileType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        email: session.user.email,
        name: session.user.name || undefined,
      },
      versionHistory: versionHistory.length > 0 ? versionHistory : undefined,
      isUpdate,
      icon: appIcon || undefined,
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

