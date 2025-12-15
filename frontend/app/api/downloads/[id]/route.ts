import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';

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
    const uploadsDir = path.join(process.cwd(), 'uploads', id);

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

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
