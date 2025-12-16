import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import ApkReader from 'adbkit-apkreader';
import JSZip from 'jszip';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import plist from 'plist';
import bplistParser from 'bplist-parser';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  // Fallback for obfuscated APKs: find PNG files in mipmap/drawable folders only
  // Exclude files that look like third-party app icons (whatsapp, facebook, etc.)
  console.log('Trying fallback for obfuscated APK...');
  
  const EXCLUDED_ICON_NAMES = [
    'whatsapp', 'facebook', 'twitter', 'instagram', 'telegram', 'google', 
    'youtube', 'linkedin', 'snapchat', 'tiktok', 'wechat', 'messenger',
    'viber', 'skype', 'discord', 'slack', 'zoom', 'teams'
  ];
  
  const pngCandidates: { path: string; size: number; priority: number }[] = [];
  
  for (const filePath of allPngInRes) {
    const lowerPath = filePath.toLowerCase();
    
    // Skip files that look like third-party app icons
    if (EXCLUDED_ICON_NAMES.some(name => lowerPath.includes(name))) {
      console.log('Skipping third-party icon:', filePath);
      continue;
    }
    
    // Skip files in drawable folders that aren't icon-related
    if (lowerPath.includes('drawable') && !lowerPath.includes('icon') && !lowerPath.includes('logo')) {
      continue;
    }
    
    const file = zip.file(filePath);
    if (file && !file.dir) {
      try {
        const buffer = await file.async('nodebuffer');
        // Check if valid PNG and reasonable icon size (2KB to 100KB)
        if (buffer.length >= 2000 && buffer.length <= 100000 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 && 
            buffer[2] === 0x4E && buffer[3] === 0x47) {
          // Prioritize mipmap folders and files with 'icon' or 'logo' in name
          let priority = 0;
          if (lowerPath.includes('mipmap')) priority += 10;
          if (lowerPath.includes('ic_launcher')) priority += 20;
          if (lowerPath.includes('icon')) priority += 5;
          if (lowerPath.includes('logo')) priority += 5;
          if (lowerPath.includes('xxxhdpi')) priority += 4;
          if (lowerPath.includes('xxhdpi')) priority += 3;
          if (lowerPath.includes('xhdpi')) priority += 2;
          
          pngCandidates.push({ path: filePath, size: buffer.length, priority });
        }
      } catch (e) {
        // Skip
      }
    }
  }
  
  // Sort by priority first, then by size
  pngCandidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.size - a.size;
  });
  console.log('PNG candidates by priority:', pngCandidates.slice(0, 5));
  
  // Only use fallback if we have high-confidence candidates (priority > 0)
  // This prevents picking random images from obfuscated APKs
  const highPriorityCandidates = pngCandidates.filter(c => c.priority > 0);
  
  if (highPriorityCandidates.length === 0) {
    console.log('No high-confidence icon candidates found, skipping fallback to avoid wrong icon');
    return undefined;
  }
  
  // Try the highest priority ones first
  for (const candidate of highPriorityCandidates.slice(0, 10)) {
    const iconFile = zip.file(candidate.path);
    if (iconFile) {
      try {
        const iconBuffer = await iconFile.async('nodebuffer');
        console.log('Extracted icon from obfuscated APK:', candidate.path, 'priority:', candidate.priority, 'size:', candidate.size);
        return `data:image/png;base64,${iconBuffer.toString('base64')}`;
      } catch (e) {
        // Continue to next
      }
    }
  }

  console.log('No valid icon found');
  return undefined;
}

// Parse IPA file to extract bundle ID, version, and icon
async function parseIpa(buffer: Buffer, fileName: string): Promise<NextResponse> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files);
    
    // Find the .app folder inside Payload
    const appFolder = files.find(f => f.match(/^Payload\/[^\/]+\.app\/$/));
    if (!appFolder) {
      console.log('No .app folder found in IPA');
      return NextResponse.json({
        success: true,
        appName: fileName.replace('.ipa', ''),
      });
    }
    
    const appPath = appFolder;
    console.log('Found app folder:', appPath);
    
    // Read Info.plist
    const infoPlistPath = `${appPath}Info.plist`;
    const infoPlistFile = zip.file(infoPlistPath);
    
    let bundleId: string | undefined;
    let version: string | undefined;
    let appName: string | undefined;
    let iconName: string | undefined;
    
    if (infoPlistFile) {
      const plistData = await infoPlistFile.async('nodebuffer');
      let plistContent: Record<string, unknown> | null = null;
      
      // Try XML plist first
      try {
        plistContent = plist.parse(plistData.toString('utf8')) as Record<string, unknown>;
        console.log('Parsed XML plist successfully');
      } catch (e) {
        console.log('Not XML plist, trying binary format...');
        // Try binary plist
        try {
          const parsed = bplistParser.parseBuffer(plistData);
          if (parsed && parsed.length > 0) {
            plistContent = parsed[0] as Record<string, unknown>;
            console.log('Parsed binary plist successfully');
          }
        } catch (e2) {
          console.error('Failed to parse binary plist:', e2);
        }
      }
      
      if (plistContent) {
        bundleId = plistContent.CFBundleIdentifier as string;
        version = (plistContent.CFBundleShortVersionString || plistContent.CFBundleVersion) as string;
        appName = (plistContent.CFBundleDisplayName || plistContent.CFBundleName) as string;
        
        // Get icon file names from plist
        const icons = plistContent.CFBundleIcons as Record<string, unknown>;
        const primaryIcon = icons?.CFBundlePrimaryIcon as Record<string, unknown>;
        const iconFiles = primaryIcon?.CFBundleIconFiles as string[];
        if (iconFiles && iconFiles.length > 0) {
          iconName = iconFiles[iconFiles.length - 1];
        }
        
        console.log('Parsed Info.plist:', { bundleId, version, appName, iconName });
      }
    }
    
    // Extract icon
    let iconBase64: string | undefined;
    
    // List all files in app folder for debugging
    const appFiles = files.filter(f => f.startsWith(appPath));
    console.log('All files in app folder:', appFiles.slice(0, 30)); // First 30 files
    
    const pngFiles = files.filter(f => f.startsWith(appPath) && f.endsWith('.png'));
    console.log('PNG files in app folder:', pngFiles);
    
    // Check for Assets.car (compiled asset catalog)
    const assetsCar = files.find(f => f.includes('Assets.car'));
    if (assetsCar) {
      console.log('Found Assets.car - icons are compiled in asset catalog');
    }
    
    if (iconName) {
      // Try different icon paths
      const iconPaths = [
        `${appPath}${iconName}@3x.png`,
        `${appPath}${iconName}@2x.png`,
        `${appPath}${iconName}.png`,
        `${appPath}AppIcon60x60@3x.png`,
        `${appPath}AppIcon60x60@2x.png`,
        `${appPath}AppIcon76x76@2x~ipad.png`,
      ];
      
      console.log('Trying icon paths:', iconPaths);
      
      for (const iconPath of iconPaths) {
        const iconFile = zip.file(iconPath);
        if (iconFile) {
          try {
            const iconBuffer = await iconFile.async('nodebuffer');
            iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
            console.log('Found icon at:', iconPath);
            break;
          } catch (e) {
            console.error('Failed to extract icon:', e);
          }
        }
      }
    }
    
    // If no icon found yet, search for any AppIcon
    if (!iconBase64) {
      const iconFiles = files.filter(f => 
        f.startsWith(appPath) && 
        (f.includes('AppIcon') || f.includes('Icon')) && 
        f.endsWith('.png')
      ).sort((a, b) => b.length - a.length); // Prefer longer names (usually higher res)
      
      console.log('Fallback icon search, found files:', iconFiles);
      
      for (const iconPath of iconFiles) {
        const iconFile = zip.file(iconPath);
        if (iconFile) {
          try {
            const iconBuffer = await iconFile.async('nodebuffer');
            if (iconBuffer.length > 100) { // Skip tiny files
              iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
              console.log('Found icon at:', iconPath);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }
    
    if (!iconBase64) {
      console.log('No icon found in IPA');
    }
    
    return NextResponse.json({
      success: true,
      versionName: version,
      packageName: bundleId,
      appName: appName || fileName.replace('.ipa', ''),
      icon: iconBase64,
    });
  } catch (error) {
    console.error('IPA parsing error:', error);
    return NextResponse.json({
      success: true,
      appName: fileName.replace('.ipa', ''),
    });
  }
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

    const isIpa = file.name.toLowerCase().endsWith('.ipa');
    const isApk = file.name.toLowerCase().endsWith('.apk');

    if (!isApk && !isIpa) {
      return NextResponse.json({ error: 'File must be an APK or IPA' }, { status: 400 });
    }

    // Write file to temp directory
    const tempDir = path.join(os.tmpdir(), 'app-parser');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempFilePath, buffer);

    // Handle IPA files
    if (isIpa) {
      return await parseIpa(buffer, file.name);
    }

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
      console.log('Icon extraction result:', iconBase64 ? `Got icon (${iconBase64.length} chars)` : 'No icon');
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

