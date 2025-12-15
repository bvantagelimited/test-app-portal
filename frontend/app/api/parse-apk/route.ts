import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import ApkReader from 'adbkit-apkreader';
import JSZip from 'jszip';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Common icon patterns in APK
const ICON_PATTERNS = [
  'ic_launcher',
  'ic_launcher_foreground',
  'app_icon',
  'launcher_icon',
  'icon',
];

const RESOLUTION_ORDER = ['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi', 'anydpi'];

async function extractIcon(zip: JSZip, iconRef?: string): Promise<string | undefined> {
  const allFiles = Object.keys(zip.files);
  console.log('Total files in APK:', allFiles.length);
  console.log('Icon reference from manifest:', iconRef);
  
  // If we have an icon reference from manifest, try to find it
  // Icon ref format: "res/mipmap-xxxhdpi-v4/ic_launcher.png" or "@mipmap/ic_launcher" or "resourceId:0x7f0c0000"
  if (iconRef && !iconRef.startsWith('resourceId:')) {
    // Try to find files matching the icon reference
    let iconName = iconRef;
    
    // Handle @mipmap/ic_launcher or @drawable/icon format
    if (iconRef.startsWith('@')) {
      const parts = iconRef.substring(1).split('/');
      if (parts.length === 2) {
        const [folder, name] = parts;
        // Search for this icon in various resolutions
        const resolutions = ['xxxhdpi', 'xxhdpi', 'xhdpi', 'hdpi', 'mdpi', 'anydpi'];
        for (const res of resolutions) {
          const possiblePaths = [
            `res/${folder}-${res}-v4/${name}.png`,
            `res/${folder}-${res}/${name}.png`,
            `res/${folder}/${name}.png`,
          ];
          for (const path of possiblePaths) {
            const iconFile = zip.file(path);
            if (iconFile) {
              try {
                const iconBuffer = await iconFile.async('nodebuffer');
                if (iconBuffer.length > 8 && iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50) {
                  console.log('Found icon from manifest ref at:', path);
                  return `data:image/png;base64,${iconBuffer.toString('base64')}`;
                }
              } catch (e) {
                // Continue
              }
            }
          }
        }
      }
    }
  }
  
  // Get all PNG files in res/ folder
  const allPngInRes = allFiles.filter(f => f.endsWith('.png') && f.includes('res/') && !f.endsWith('.9.png'));
  console.log('PNG files in res/ (excluding 9-patch):', allPngInRes.length);
  
  // First try standard icon paths
  let iconFiles = allFiles.filter(f => {
    if (!f.endsWith('.png')) return false;
    const lowerPath = f.toLowerCase();
    if (!lowerPath.includes('res/')) return false;
    if (lowerPath.includes('mipmap') || 
        lowerPath.includes('ic_launcher') || 
        lowerPath.includes('app_icon') ||
        lowerPath.includes('launcher')) {
      if (lowerPath.includes('_foreground') || 
          lowerPath.includes('_background') || 
          lowerPath.includes('_round') ||
          lowerPath.includes('_monochrome')) {
        return false;
      }
      return true;
    }
    return false;
  });

  console.log('Standard icon candidates:', iconFiles.length);

  // Sort by resolution (prefer higher resolution)
  iconFiles.sort((a, b) => {
    const aRes = RESOLUTION_ORDER.findIndex(r => a.includes(r));
    const bRes = RESOLUTION_ORDER.findIndex(r => b.includes(r));
    return (aRes === -1 ? 999 : aRes) - (bRes === -1 ? 999 : bRes);
  });

  // Try to extract the best icon
  for (const iconPath of iconFiles) {
    const iconFile = zip.file(iconPath);
    if (iconFile) {
      try {
        const iconBuffer = await iconFile.async('nodebuffer');
        // Check if it's a valid PNG (starts with PNG signature)
        if (iconBuffer.length > 8 && 
            iconBuffer[0] === 0x89 && 
            iconBuffer[1] === 0x50 && 
            iconBuffer[2] === 0x4E && 
            iconBuffer[3] === 0x47) {
          console.log('Extracted valid PNG icon from:', iconPath, 'size:', iconBuffer.length);
          return `data:image/png;base64,${iconBuffer.toString('base64')}`;
        }
      } catch (e) {
        console.error('Error reading icon at', iconPath, e);
      }
    }
  }

  // Fallback for obfuscated APKs: find PNG files with typical icon sizes (2KB-50KB)
  // Icons are typically square and between 48x48 to 512x512 pixels
  console.log('Trying fallback for obfuscated APK...');
  
  const pngCandidates: { path: string; size: number }[] = [];
  
  for (const filePath of allPngInRes) {
    const file = zip.file(filePath);
    if (file && !file.dir) {
      try {
        const buffer = await file.async('nodebuffer');
        // Check if valid PNG and reasonable icon size (2KB to 100KB)
        if (buffer.length >= 2000 && buffer.length <= 100000 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && 
            buffer[2] === 0x4E && buffer[3] === 0x47) {
          pngCandidates.push({ path: filePath, size: buffer.length });
        }
      } catch (e) {
        // Skip
      }
    }
  }
  
  // Sort by size descending (larger icons are usually better quality)
  pngCandidates.sort((a, b) => b.size - a.size);
  console.log('PNG candidates by size:', pngCandidates.slice(0, 5));
  
  // Try the largest ones first (likely to be high-res icons)
  for (const candidate of pngCandidates.slice(0, 10)) {
    const iconFile = zip.file(candidate.path);
    if (iconFile) {
      try {
        const iconBuffer = await iconFile.async('nodebuffer');
        console.log('Extracted icon from obfuscated APK:', candidate.path, 'size:', candidate.size);
        return `data:image/png;base64,${iconBuffer.toString('base64')}`;
      } catch (e) {
        // Continue to next
      }
    }
  }

  console.log('No valid icon found');
  return undefined;
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email?.endsWith('@ipification.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.apk')) {
      return NextResponse.json({ error: 'File must be an APK' }, { status: 400 });
    }

    // Write file to temp directory for adbkit-apkreader
    const tempDir = path.join(os.tmpdir(), 'apk-parser');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempFilePath, buffer);

    // Parse APK using adbkit-apkreader
    const reader = await ApkReader.open(tempFilePath);
    const manifest = await reader.readManifest();

    // Extract info from manifest
    const packageName = manifest.package || undefined;
    const versionName = manifest.versionName || undefined;
    const versionCode = manifest.versionCode || undefined;
    
    // Try to get app label from manifest application
    let appName = manifest.application?.label || '';
    
    // If appName is a resource reference (starts with @ or resourceId:), use package name's last part
    if (!appName || appName.startsWith('@') || appName.startsWith('resourceId:')) {
      // Use last part of package name, capitalize first letter
      const lastPart = packageName?.split('.').pop() || '';
      appName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1) || file.name.replace('.apk', '');
    }

    // Get icon path from manifest
    const iconRef = manifest.application?.icon;
    console.log('Icon reference from manifest:', iconRef);

    // Extract icon from APK
    let iconBase64: string | undefined;
    try {
      const zip = await JSZip.loadAsync(buffer);
      iconBase64 = await extractIcon(zip, iconRef);
    } catch (e) {
      console.error('Failed to extract icon:', e);
    }

    return NextResponse.json({
      success: true,
      versionName: versionName || undefined,
      versionCode: versionCode || undefined,
      packageName: packageName || undefined,
      appName: appName || file.name.replace('.apk', ''),
      icon: iconBase64,
    });
  } catch (error) {
    console.error('APK parsing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to parse APK',
      appName: 'Untitled App',
    });
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

