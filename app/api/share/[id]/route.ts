import { NextRequest, NextResponse } from 'next/server';
import { readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uploadsDir = path.join(process.cwd(), 'uploads', id);

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const metadataPath = path.join(uploadsDir, 'metadata.json');
    if (!existsSync(metadataPath)) {
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
    }

    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching share data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file information' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID to prevent directory traversal
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', id);

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete the entire upload directory
    await rm(uploadsDir, { recursive: true, force: true });

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting share:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
