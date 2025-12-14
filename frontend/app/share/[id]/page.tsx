'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

interface VersionHistory {
  version: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

interface Metadata {
  id: string;
  fileName: string;
  appName: string;
  version: string;
  fileSize: number;
  fileType?: string;
  uploadedAt: string;
  versionHistory?: VersionHistory[];
}

export default function SharePage() {
  const params = useParams();
  const id = params.id as string;
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/share/${id}`);
        if (!response.ok) {
          throw new Error('File not found');
        }
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMetadata();
    }
  }, [id]);

  const handleDownload = () => {
    window.location.href = `/api/download/${id}`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/share/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      // Redirect to home after successful deletion
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#fc1c44]/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#fc1c44] rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading app details...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-gray-50 rounded-3xl shadow-xl p-8 max-w-md w-full border border-gray-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              App Not Found
            </h2>
            <p className="text-gray-600">
              {error || 'The requested app could not be found. The link may have expired or been removed.'}
            </p>
            <a
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-[#fc1c44] hover:bg-[#fc1c44]/90 text-white rounded-xl font-medium transition-all hover:scale-105"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <img 
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NC44OTIiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NC44OTIgNDUiPjxkZWZzPjxzdHlsZT4uYXtmaWxsOiNmZmY7fS5ie2ZpbGw6I2ZiMWM0NDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgY2xhc3M9ImEiIHdpZHRoPSIzMSIgaGVpZ2h0PSIyNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi45OTkgOSkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48cGF0aCBjbGFzcz0iYiIgZD0iTTcuNDIxLDYuNjc1LDkuNjU3LDQuNTA3VjBIMFY2LjY3NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIyLjM4NSAxNS4yOTUpIi8+PHBhdGggY2xhc3M9ImIiIGQ9Ik0wLDQ1VjBINDQuODkyVjMyLjAxOUwzMS45NjcsNDQuOTc1Wk0xOC4yMDgsMTEuMDgzVjMzLjk0MWg0LjJWMjYuMTgySDMxLjU1bDQuNjkzLTQuNTA4aC4wMjVWMTEuMDgzWm0tOS41NTgsMFYzMy45NDFoNC4yVjExLjA4M1oiLz48L2c+PC9zdmc+"
          alt="IPification Logo"
          className="h-10 w-auto"
        />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-lg mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-[#fc1c44] px-6 py-6 text-center">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                {metadata.appName}
              </h1>
              <span className="text-white/80 text-sm">
                Version {metadata.version}
              </span>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <svg className="w-6 h-6 mx-auto mb-2 text-[#fc1c44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-900 font-semibold text-sm">{formatFileSize(metadata.fileSize)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Size</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <svg className="w-6 h-6 mx-auto mb-2 text-[#fc1c44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-900 font-semibold text-sm">{formatDate(metadata.uploadedAt)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Updated</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-200">
                  <svg className="w-6 h-6 mx-auto mb-2 text-[#fc1c44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-900 font-semibold text-sm">{formatTime(metadata.uploadedAt)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Time</p>
                </div>
              </div>

              {/* File Info */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#fc1c44] to-[#fc1c44] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{metadata.fileName.split('.').pop()?.toUpperCase() || 'APP'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900 font-medium text-sm truncate">{metadata.fileName}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{metadata.fileType || 'Application'}</p>
                  </div>
                </div>
              </div>

              {/* Version History */}
              {metadata.versionHistory && metadata.versionHistory.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#fc1c44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-900 font-medium text-sm">Version History</span>
                      <span className="bg-[#fc1c44]/10 text-[#fc1c44] text-xs px-2 py-0.5 rounded-full">
                        {metadata.versionHistory.length + 1}
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showHistory && (
                    <div className="mt-3 bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                      {/* Current version */}
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-500/20"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-medium text-sm">{metadata.version}</span>
                            <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full">Latest</span>
                          </div>
                          <p className="text-gray-500 text-xs">{formatDate(metadata.uploadedAt)}</p>
                        </div>
                        <span className="text-gray-500 text-xs">{formatFileSize(metadata.fileSize)}</span>
                      </div>

                      {/* Previous versions */}
                      {metadata.versionHistory.slice().reverse().map((v, index) => (
                        <div key={index} className="flex items-center gap-3 opacity-60">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <div className="flex-1">
                            <span className="text-gray-700 text-sm">{v.version}</span>
                            <p className="text-gray-400 text-xs">{formatDate(v.uploadedAt)}</p>
                          </div>
                          <span className="text-gray-400 text-xs">{formatFileSize(v.fileSize)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="w-full bg-[#fc1c44] hover:bg-[#fc1c44]/90 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg shadow-[#fc1c44]/25 hover:shadow-[#fc1c44]/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download App
              </button>

              {/* Copy Link Button */}
              <button
                onClick={copyLink}
                className="w-full mt-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 py-3 px-6 rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-[#fc1c44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Share Link</span>
                  </>
                )}
              </button>

              {/* Delete Button - Only visible with ?admin=true */}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full mt-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 py-3 px-6 rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete This App</span>
                </button>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-200 shadow-2xl">
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete App?</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      This will permanently delete <strong className="text-gray-900">{metadata.appName}</strong> and all its version history. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {deleting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <span>Delete</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#fc1c44] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-gray-900 text-sm font-medium">Installation Instructions</p>
                  <p className="text-gray-500 text-xs mt-1">
                    After downloading, open the file and follow the prompts to install. For mobile apps, you may need to enable installation from unknown sources in your device settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <p className="text-center text-gray-400 text-xs mt-6">
            Powered by IPification
          </p>
        </div>
      </div>
    </div>
  );
}

