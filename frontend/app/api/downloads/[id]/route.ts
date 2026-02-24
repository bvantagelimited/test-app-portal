import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';

// Resolve an old UUID-based ID to the current folder name by scanning metadata
async function resolveId(id: string): Promise<string | null> {
  const uploadsBase = path.join(process.cwd(), 'uploads');
  if (existsSync(path.join(uploadsBase, id))) return id;
  if (!existsSync(uploadsBase)) return null;
  try {
    const folders = await readdir(uploadsBase, { withFileTypes: true });
    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      const metadataPath = path.join(uploadsBase, folder.name, 'metadata.json');
      if (!existsSync(metadataPath)) continue;
      try {
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);
        if (metadata.previousIds && Array.isArray(metadata.previousIds) && metadata.previousIds.includes(id)) {
          return folder.name;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email?.endsWith('@ipification.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const resolvedId = await resolveId(id);

    if (!resolvedId) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', resolvedId);
    const metadataPath = path.join(uploadsDir, 'metadata.json');
    if (!existsSync(metadataPath)) {
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
    }

    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    return NextResponse.json({
      appName: metadata.appName,
      version: metadata.version,
      downloadCount: metadata.downloadCount || 0,
      downloads: metadata.downloads || [],
    });
  } catch (error) {
    console.error('Error fetching downloads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch download data' },
      { status: 500 }
    );
  }
}
