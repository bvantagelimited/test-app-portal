import { NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!existsSync(uploadsDir)) {
      return NextResponse.json([]);
    }

    const folders = await readdir(uploadsDir, { withFileTypes: true });
    const apps = [];

    for (const folder of folders) {
      if (folder.isDirectory()) {
        const metadataPath = path.join(uploadsDir, folder.name, 'metadata.json');
        if (existsSync(metadataPath)) {
          try {
            const metadataContent = await readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            apps.push({
              id: folder.name,
              appName: metadata.appName,
              version: metadata.version,
              uploadedAt: metadata.uploadedAt,
              fileSize: metadata.fileSize,
            });
          } catch {
            // Skip invalid metadata files
          }
        }
      }
    }

    // Sort by upload date (newest first)
    apps.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error listing apps:', error);
    return NextResponse.json(
      { error: 'Failed to list apps' },
      { status: 500 }
    );
  }
}
