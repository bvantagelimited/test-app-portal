import { Metadata } from 'next';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface Params {
  id: string;
}

async function getMetadata(id: string) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', id);
    const metadataPath = path.join(uploadsDir, 'metadata.json');
    
    if (!existsSync(metadataPath)) {
      return null;
    }
    
    const metadataContent = await readFile(metadataPath, 'utf-8');
    return JSON.parse(metadataContent);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const appData = await getMetadata(id);
  
  if (!appData) {
    return {
      title: 'App Not Found - IPification',
      description: 'The requested app could not be found.',
    };
  }

  const title = `${appData.appName} v${appData.version} - IPification`;
  const description = `Download ${appData.appName} (${appData.fileType || 'App'}) - Version ${appData.version}`;
  
  // Use API endpoint to serve the app icon as a proper image URL
  const baseUrl = process.env.AUTH_URL || 'https://apps.ipification.com';
  const ogImage = `${baseUrl}/api/og-image/${id}`;

  return {
    title,
    description,
    openGraph: {
      title: appData.appName,
      description,
      type: 'website',
      siteName: 'IPification App Distribution',
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: appData.appName,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: appData.appName,
      description,
      images: [ogImage],
    },
  };
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
