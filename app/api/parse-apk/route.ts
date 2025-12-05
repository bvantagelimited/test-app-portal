import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Simple binary XML parser for AndroidManifest.xml
function parseBinaryXML(buffer: Buffer): { versionName?: string; packageName?: string } {
  try {
    const data = new Uint8Array(buffer);
    
    // Try multiple decoding methods
    let text = '';
    
    // Try UTF-8
    try {
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      text = textDecoder.decode(buffer);
    } catch (e) {
      // Fallback
    }
    
    // Also try UTF-16LE (common in binary XML)
    let text16 = '';
    try {
      const textDecoder16 = new TextDecoder('utf-16le', { fatal: false });
      text16 = textDecoder16.decode(buffer);
    } catch (e) {
      // Fallback
    }
    
    // Combine both texts for searching
    const combinedText = text + ' ' + text16;
    
    // Try multiple patterns for versionName
    // Pattern 1: versionName="1.2.3" or versionName='1.2.3'
    let versionNameMatch = combinedText.match(/versionName\s*=\s*["']([^"']+)["']/i);
    
    // Pattern 2: versionName: 1.2.3
    if (!versionNameMatch) {
      versionNameMatch = combinedText.match(/versionName\s*[:=]\s*([\d.]+[\w.-]*)/i);
    }
    
    // Pattern 3: Look for version strings in the data
    if (!versionNameMatch) {
      // Look for common version patterns in raw data
      const versionPattern = /([\d]+\.[\d]+(?:\.[\d]+)?(?:\.[\d]+)?(?:-[\w]+)?)/g;
      const matches = combinedText.match(versionPattern);
      if (matches && matches.length > 0) {
        // Take the first reasonable version string
        versionNameMatch = [null, matches[0]];
      }
    }
    
    // Try to find package name
    let packageMatch = combinedText.match(/package\s*=\s*["']([^"']+)["']/i);
    if (!packageMatch) {
      packageMatch = combinedText.match(/package\s*[:=]\s*([\w.]+)/i);
    }
    
    return {
      versionName: versionNameMatch ? versionNameMatch[1] : undefined,
      packageName: packageMatch ? packageMatch[1] : undefined,
    };
  } catch (error) {
    console.error('Error parsing binary XML:', error);
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.apk')) {
      return NextResponse.json({ error: 'File must be an APK' }, { status: 400 });
    }

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse APK as ZIP
    const zip = await JSZip.loadAsync(buffer);
    
    // Get AndroidManifest.xml
    const manifestFile = zip.file('AndroidManifest.xml');
    if (!manifestFile) {
      return NextResponse.json({ 
        error: 'Could not find AndroidManifest.xml',
        appName: file.name.replace('.apk', ''),
      });
    }

    // Read manifest
    const manifestBuffer = await manifestFile.async('nodebuffer');
    
    // Parse binary XML
    const parsed = parseBinaryXML(manifestBuffer);
    
    // Also try to get app name from resources if available
    let appName = parsed.packageName?.split('.').pop() || file.name.replace('.apk', '');
    
    // Try to extract from strings.xml if available
    try {
      const resFolder = zip.folder('res');
      if (resFolder) {
        // Look for strings.xml in various language folders
        const stringFiles = Object.keys(zip.files).filter(
          path => path.includes('strings.xml') && path.startsWith('res/')
        );
        
        if (stringFiles.length > 0) {
          const stringsFile = zip.file(stringFiles[0]);
          if (stringsFile) {
            const stringsContent = await stringsFile.async('string');
            const appNameMatch = stringsContent.match(/<string name="app_name">([^<]+)<\/string>/i);
            if (appNameMatch) {
              appName = appNameMatch[1].trim();
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors in resource parsing
    }

    return NextResponse.json({
      success: true,
      versionName: parsed.versionName || undefined,
      packageName: parsed.packageName || undefined,
      appName: appName || file.name.replace('.apk', ''),
    });
  } catch (error) {
    console.error('APK parsing error:', error);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    return NextResponse.json({
      success: false,
      error: 'Failed to parse APK',
      appName: file?.name?.replace('.apk', '') || 'Untitled App',
    });
  }
}

