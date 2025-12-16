'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMenu } from '@/components/UserMenu';

interface DownloadRecord {
  timestamp: string;
  userAgent: string;
  browser: string;
  os: string;
  ip: string;
}

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
  downloadCount?: number;
}

export default function AppsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const router = useRouter();

  const fetchApps = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/apps');
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

  useEffect(() => {
    fetchApps();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/share/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      // Remove from list
      setApps(apps.filter(app => app.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
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

  const fetchDownloads = async (id: string) => {
    setLoadingDownloads(true);
    setShowDownloads(id);
    try {
      const response = await fetch(`/api/downloads/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDownloads(data.downloads || []);
      }
    } catch (err) {
      console.error('Failed to fetch downloads:', err);
    } finally {
      setLoadingDownloads(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - same as main page */}
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
              <p className="text-xs text-gray-500">Internal app sharing tool</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/my-apps"
              className="text-sm font-medium text-[#fc1c44] transition-colors whitespace-nowrap"
            >
              My Apps
            </a>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Apps</h1>
            {/* <p className="text-gray-500 text-sm mt-1">Manage your uploaded applications</p> */}
          </div>
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-[#fc1c44] text-white rounded-xl font-medium hover:bg-[#d9183b] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload New
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-12 h-12 border-4 border-[#fc1c44]/20 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-[#fc1c44] rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
              </div>
              <p className="text-gray-500 mt-4">Loading apps...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchApps}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No apps uploaded yet</h3>
            
          </div>
        ) : (
          <div className="grid gap-4">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* App Icon */}
                  <div className="flex-shrink-0">
                    {app.icon ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md">
                        <img 
                          src={app.icon} 
                          alt={app.appName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.parentElement!.style.display = 'none';
                            target.parentElement!.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      </div>
                    ) : null}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-[#fc1c44] to-[#d9183b] flex items-center justify-center shadow-md ${app.icon ? 'hidden' : ''}`}>
                      <span className="text-white font-bold text-xl">
                        {app.appName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{app.appName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full">v{app.version}</span>
                          <span>{formatFileSize(app.fileSize)}</span>
                          <span className="hidden sm:inline">{app.fileType || 'App'}</span>
                        </div>
                        {app.packageName && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{app.packageName}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500 hidden md:block">
                        <p>{formatDate(app.uploadedAt)}</p>
                        <button
                          onClick={() => fetchDownloads(app.id)}
                          className="flex items-center justify-end gap-1 text-xs text-gray-400 mt-1 hover:text-[#fc1c44] transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>{app.downloadCount || 0} downloads</span>
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => router.push(`/share/${app.id}`)}
                        className="px-3 py-1.5 bg-[#fc1c44] text-white text-sm rounded-lg hover:bg-[#d9183b] transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => copyShareLink(app.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                          copiedId === app.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {copiedId === app.id ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => window.location.href = `/api/download/${app.id}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(app.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete App?</h3>
              <p className="text-gray-600 text-sm mb-6">
                This will permanently delete this app and all its data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloads Modal */}
      {showDownloads && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Download History</h2>
              <button
                onClick={() => { setShowDownloads(null); setDownloads([]); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingDownloads ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fc1c44]"></div>
                </div>
              ) : downloads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <p>No downloads yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {downloads.map((download, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {download.browser}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              {download.os}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 truncate" title={download.userAgent}>
                            {download.userAgent}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500 flex-shrink-0">
                          <p>{new Date(download.timestamp).toLocaleDateString()}</p>
                          <p>{new Date(download.timestamp).toLocaleTimeString()}</p>
                          <p className="text-gray-400 mt-1">{download.ip}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
