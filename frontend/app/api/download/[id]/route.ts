import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface DownloadRecord {
  timestamp: string;
  userAgent: string;
  browser: string;
  os: string;
  ip: string;
}

function parseUserAgent(userAgent: string): { browser: string; os: string } {
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    browser = 'Opera';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  return { browser, os };
}

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

    const filePath = path.join(uploadsDir, metadata.fileName);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'APK file not found' }, { status: 404 });
    }

    // Track download
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const { browser, os } = parseUserAgent(userAgent);
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';

    const downloadRecord: DownloadRecord = {
      timestamp: new Date().toISOString(),
      userAgent,
      browser,
      os,
      ip: typeof ip === 'string' ? ip.split(',')[0].trim() : 'Unknown',
    };

    // Update metadata with download count and history
    const downloads = metadata.downloads || [];
    downloads.push(downloadRecord);
    metadata.downloads = downloads;
    metadata.downloadCount = downloads.length;

    // Save updated metadata
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${metadata.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}


