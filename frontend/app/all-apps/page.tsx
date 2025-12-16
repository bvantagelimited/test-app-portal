'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserMenu } from '@/components/UserMenu';

interface AppItem {
  id: string;
  appName: string;
  version: string;
  packageName?: string;
  uploadedAt: string;
  fileSize: number;
  fileType?: string;
  icon?: string;
  uploadedBy?: {
    email: string;
    name?: string;
  };
}

export default function BrowsePage() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/public-apps');
        if (!response.ok) {
          throw new Error('Failed to fetch apps');
        }
        const data = await response.json();
        setApps(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load apps');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NC44OTIiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NC44OTIgNDUiPjxkZWZzPjxzdHlsZT4uYXtmaWxsOiNmZmY7fS5ie2ZpbGw6I2ZiMWM0NDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgY2xhc3M9ImEiIHdpZHRoPSIzMSIgaGVpZ2h0PSIyNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi45OTkgOSkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48cGF0aCBjbGFzcz0iYiIgZD0iTTcuNDIxLDYuNjc1LDkuNjU3LDQuNTA3VjBIMFY2LjY3NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIyLjM4NSAxNS4yOTUpIi8+PHBhdGggY2xhc3M9ImIiIGQ9Ik0wLDQ1VjBINDQuODkyVjMyLjAxOUwzMS45NjcsNDQuOTc1Wk0xOC4yMDgsMTEuMDgzVjMzLjk0MWg0LjJWMjYuMTgySDMxLjU1bDQuNjkzLTQuNTA4aC4wMjVWMTEuMDgzWm0tOS41NTgsMFYzMy45NDFoNC4yVjExLjA4M1oiLz48L2c+PC9zdmc+"
                alt="IPification Logo"
                className="h-8 w-auto"
              />
            </a>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-lg font-semibold text-gray-900">App Distribution</h1>
              <p className="text-xs text-gray-500">Browse all available apps</p>
            </div>
          </div>
{session?.user ? (
            <div className="flex items-center gap-4">
              <a
                href="/my-apps"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Apps
              </a>
              <a
                href="/upload"
                className="px-4 py-2 text-sm font-medium text-white bg-[#fc1c44] rounded-xl hover:bg-[#d9183b] transition-colors"
              >
                Upload App
              </a>
              <UserMenu />
            </div>
          ) : (
            <a
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-[#fc1c44] rounded-xl hover:bg-[#d9183b] transition-colors"
            >
             Sign in
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Available Apps</h1>
          {/* <p className="text-gray-500 text-sm mt-1">Browse and download available applications</p> */}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fc1c44]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No apps available</h3>
            <p className="text-gray-500">Check back later for new apps.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* App Icon */}
                  <div className="flex-shrink-0">
                    {app.icon ? (
                      <img 
                        src={app.icon} 
                        alt={app.appName}
                        className="w-16 h-16 rounded-xl object-cover shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 bg-gradient-to-br from-[#fc1c44] to-[#ff6b6b] rounded-xl flex items-center justify-center shadow-md ${app.icon ? 'hidden' : ''}`}>
                      <span className="text-white font-bold text-lg">
                        {app.appName?.charAt(0)?.toUpperCase() || 'A'}
                      </span>
                    </div>
                  </div>
                  
                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{app.appName}</h3>
                    <p className="text-sm text-gray-500">v{app.version}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>{formatFileSize(app.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(app.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {app.fileType && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {app.fileType.toUpperCase()}
                        </span>
                      )}
                      {session?.user && app.uploadedBy && (
                        <span className="text-xs text-gray-400">
                          by {app.uploadedBy.name || app.uploadedBy.email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions - View and Share only */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={`/share/${app.id}`}
                    className="w-1/2 px-3 py-2 bg-[#fc1c44] text-white text-sm font-medium rounded-xl hover:bg-[#d9183b] transition-colors text-center"
                  >
                    View
                  </a>
                  <button
                    onClick={() => copyShareLink(app.id)}
                    className="w-1/2 px-3 py-2 bg-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 border border-gray-300"
                    title="Copy share link"
                  >
                    {copiedId === app.id ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
