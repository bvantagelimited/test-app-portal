import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, readdir, unlink } from 'fs/promises';
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
      let resolvedShareId = existingShareId;

      // If the existingShareId folder doesn't exist, try to resolve it
      // (handles case where UUID folder was migrated to packageName folder)
      if (!existsSync(path.join(uploadsDir, existingShareId))) {
        if (packageName) {
          const sanitized = packageName.replace(/[^a-zA-Z0-9._-]/g, '');
          if (sanitized && existsSync(path.join(uploadsDir, sanitized))) {
            resolvedShareId = sanitized;
          }
        }
        // Also scan all folders for previousIds match
        if (resolvedShareId === existingShareId && !existsSync(path.join(uploadsDir, resolvedShareId))) {
          try {
            const folders = await readdir(uploadsDir, { withFileTypes: true });
            for (const folder of folders) {
              if (!folder.isDirectory()) continue;
              const mp = path.join(uploadsDir, folder.name, 'metadata.json');
              if (!existsSync(mp)) continue;
              try {
                const c = await readFile(mp, 'utf-8');
                const m = JSON.parse(c);
                if (m.previousIds && Array.isArray(m.previousIds) && m.previousIds.includes(existingShareId)) {
                  resolvedShareId = folder.name;
                  break;
                }
              } catch { /* skip */ }
            }
          } catch { /* skip */ }
        }
      }

      const existingDir = path.join(uploadsDir, resolvedShareId);
      if (existsSync(existingDir)) {
        const metadataPath = path.join(existingDir, 'metadata.json');
        if (existsSync(metadataPath)) {
          const existingMetadataContent = await readFile(metadataPath, 'utf-8');
          previousMetadata = JSON.parse(existingMetadataContent);
          uploadId = resolvedShareId;
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
      // Use packageName as the share ID for friendly URLs (like Google Play store)
      // Fall back to UUID if no packageName provided
      if (packageName) {
        // Sanitize package name for use as directory name
        const sanitized = packageName.replace(/[^a-zA-Z0-9._-]/g, '');
        if (sanitized) {
          uploadId = sanitized;
          // Check if this packageName folder already exists (treat as update)
          const existingDir = path.join(uploadsDir, sanitized);
          if (existsSync(existingDir)) {
            const metadataPath = path.join(existingDir, 'metadata.json');
            if (existsSync(metadataPath)) {
              const existingMetadataContent = await readFile(metadataPath, 'utf-8');
              previousMetadata = JSON.parse(existingMetadataContent);
              isUpdate = true;

              if (previousMetadata.versionHistory) {
                versionHistory = previousMetadata.versionHistory;
              }

              versionHistory.push({
                version: previousMetadata.version,
                fileName: previousMetadata.fileName,
                fileSize: previousMetadata.fileSize,
                uploadedAt: previousMetadata.uploadedAt,
                uploadedBy: previousMetadata.uploadedBy,
              });

              // Delete old file
              const oldFilePath = path.join(existingDir, previousMetadata.fileName);
              if (existsSync(oldFilePath)) {
                await unlink(oldFilePath);
              }
            }
          }
        } else {
          uploadId = uuidv4();
        }
      } else {
        uploadId = uuidv4();
      }
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

    // Preserve previousIds for old UUID-based link redirect support
    let previousIds: string[] = previousMetadata?.previousIds || [];
    // If updating from an existingShareId that differs from the new uploadId, track it
    if (existingShareId && existingShareId !== uploadId && !previousIds.includes(existingShareId)) {
      previousIds.push(existingShareId);
    }

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
      previousIds: previousIds.length > 0 ? previousIds : undefined,
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

