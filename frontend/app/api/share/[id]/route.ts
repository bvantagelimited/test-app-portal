import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Resolve an old UUID-based ID to the current folder name by scanning metadata
async function resolveId(id: string): Promise<{ resolvedId: string; redirectToPackageName: boolean } | null> {
  const uploadsBase = path.join(process.cwd(), 'uploads');
  const directPath = path.join(uploadsBase, id);

  // Direct match — folder exists with this ID
  if (existsSync(directPath)) {
    // Check if this is a legacy UUID folder that has a packageName-based sibling
    // If so, redirect to the packageName-based URL
    const metadataPath = path.join(directPath, 'metadata.json');
    if (existsSync(metadataPath)) {
      try {
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);
        if (metadata.packageName) {
          const sanitized = metadata.packageName.replace(/[^a-zA-Z0-9._-]/g, '');
          // If the folder name differs from the sanitized packageName, it's a legacy UUID folder
          if (sanitized && sanitized !== id) {
            // Check if the packageName-based folder exists (already migrated separately)
            const packagePath = path.join(uploadsBase, sanitized);
            if (existsSync(packagePath)) {
              return { resolvedId: sanitized, redirectToPackageName: true };
            }
            // UUID folder still exists but not yet migrated — serve it directly
            return { resolvedId: id, redirectToPackageName: false };
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    return { resolvedId: id, redirectToPackageName: false };
  }

  // No direct match — scan all folders for metadata with matching old id
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
        // Match by old id stored in metadata
        if (metadata.previousIds && Array.isArray(metadata.previousIds) && metadata.previousIds.includes(id)) {
          return { resolvedId: folder.name, redirectToPackageName: true };
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resolved = await resolveId(id);

    if (!resolved) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If the ID was resolved to a different folder (old UUID → packageName), tell the client to redirect
    if (resolved.redirectToPackageName) {
      return NextResponse.json({ redirect: `/share/${resolved.resolvedId}` }, { status: 301 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', resolved.resolvedId);
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

    const resolved = await resolveId(id);
    if (!resolved) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', resolved.resolvedId);

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
