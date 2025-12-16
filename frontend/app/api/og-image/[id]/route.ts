import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uploadsDir = path.join(process.cwd(), 'uploads', id);
    const metadataPath = path.join(uploadsDir, 'metadata.json');

    if (!existsSync(metadataPath)) {
      // Return default IPification logo
      return NextResponse.redirect(new URL('/ipification-logo.svg', request.url));
    }

    const metadataContent = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    if (!metadata.icon) {
      // Return default IPification logo
      return NextResponse.redirect(new URL('/ipification-logo.svg', request.url));
    }

    // Parse base64 data URL
    const matches = metadata.icon.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.redirect(new URL('/ipification-logo.svg', request.url));
    }

    const [, imageType, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': `image/${imageType}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving OG image:', error);
    return NextResponse.redirect(new URL('/ipification-logo.svg', request.url));
  }
}
