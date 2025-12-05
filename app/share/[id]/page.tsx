'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
  uploadedAt: string;
  versionHistory?: VersionHistory[];
}

export default function SharePage() {
  const params = useParams();
  const id = params.id as string;
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              File Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {error || 'The requested file could not be found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/20 mb-4">
                <svg
                  className="h-10 w-10 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {metadata.appName}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Version {metadata.version}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    File Name:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {metadata.fileName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    File Size:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatFileSize(metadata.fileSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Uploaded:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatDate(metadata.uploadedAt)}
                  </span>
                </div>
              </div>
            </div>

            {metadata.versionHistory && metadata.versionHistory.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Version History
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-blue-200 dark:border-blue-700">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Current: {metadata.version}
                      </span>
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        (Latest)
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(metadata.uploadedAt)}
                    </span>
                  </div>
                  {metadata.versionHistory.slice().reverse().map((v, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center pb-2 border-b border-blue-200 dark:border-blue-700 last:border-0 last:pb-0"
                    >
                      <div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {v.version}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                          ({formatFileSize(v.fileSize)})
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatDate(v.uploadedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
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
              Download APK
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This link is provided by your app developer. Please download and install the APK file.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

