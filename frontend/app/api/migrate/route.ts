import { NextResponse } from 'next/server';
import { readFile, readdir, rename, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email?.endsWith('@ipification.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ migrated: 0, message: 'No uploads directory found' });
    }

    const folders = await readdir(uploadsDir, { withFileTypes: true });
    const results: { oldId: string; newId: string; appName: string }[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;

      // Only migrate UUID-named folders
      if (!UUID_REGEX.test(folder.name)) {
        skipped.push({ id: folder.name, reason: 'Not a UUID folder (already migrated or packageName-based)' });
        continue;
      }

      const metadataPath = path.join(uploadsDir, folder.name, 'metadata.json');
      if (!existsSync(metadataPath)) {
        skipped.push({ id: folder.name, reason: 'No metadata.json found' });
        continue;
      }

      try {
        const content = await readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);

        if (!metadata.packageName) {
          skipped.push({ id: folder.name, reason: 'No packageName in metadata' });
          continue;
        }

        const sanitized = metadata.packageName.replace(/[^a-zA-Z0-9._-]/g, '');
        if (!sanitized) {
          skipped.push({ id: folder.name, reason: 'PackageName sanitized to empty string' });
          continue;
        }

        const newPath = path.join(uploadsDir, sanitized);

        // If target folder already exists, skip to avoid conflicts
        if (existsSync(newPath)) {
          skipped.push({ id: folder.name, reason: `Target folder ${sanitized} already exists` });
          continue;
        }

        // Store old UUID in previousIds for redirect support
        const previousIds = metadata.previousIds || [];
        previousIds.push(folder.name);
        metadata.previousIds = previousIds;
        metadata.id = sanitized;

        // Write updated metadata first
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Rename the folder
        const oldPath = path.join(uploadsDir, folder.name);
        await rename(oldPath, newPath);

        results.push({
          oldId: folder.name,
          newId: sanitized,
          appName: metadata.appName || 'Unknown',
        });
      } catch (err) {
        skipped.push({ id: folder.name, reason: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
      }
    }

    return NextResponse.json({
      migrated: results.length,
      results,
      skipped,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
}
