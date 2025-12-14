'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ExistingApp {
  id: string;
  appName: string;
  version: string;
  uploadedAt: string;
  fileSize: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [version, setVersion] = useState('');
  const [existingShareId, setExistingShareId] = useState('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    shareUrl: string;
    uploadId: string;
    isUpdate?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [existingApps, setExistingApps] = useState<ExistingApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const router = useRouter();

  // Fetch existing apps when update mode is enabled
  useEffect(() => {
    if (isUpdateMode) {
      setLoadingApps(true);
      fetch('/api/apps')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setExistingApps(data);
          }
        })
        .catch(err => console.error('Failed to fetch apps:', err))
        .finally(() => setLoadingApps(false));
    }
  }, [isUpdateMode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const supportedExtensions = ['.apk', '.ipa', '.aab', '.exe', '.dmg', '.pkg', '.msi', '.deb', '.rpm', '.appimage'];
      const fileExt = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!supportedExtensions.includes(fileExt)) {
        setError(`Unsupported file type. Allowed: ${supportedExtensions.join(', ')}`);
        return;
      }
      setFile(selectedFile);
      setError(null);
      
      // Auto-parse APK to extract version and app name (only for APK files)
      if (fileExt === '.apk') {
        setParsing(true);
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          const response = await fetch('/api/parse-apk', {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          
          // Always try to set app name if available (even if parsing partially failed)
          if (data.appName && !appName) {
            setAppName(data.appName);
          }
          
          // Set version if parsing was successful
          if (data.success && data.versionName && !version) {
            setVersion(data.versionName);
          }
        } catch (err) {
          // Silently fail - user can still fill manually
          console.error('Failed to parse APK:', err);
        } finally {
          setParsing(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appName', appName || 'Untitled App');
      formData.append('version', version || '1.0.0');
      
      // Add existing share ID if in update mode
      if (isUpdateMode && existingShareId) {
        formData.append('existingShareId', existingShareId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with Logo and Title */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <img 
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NC44OTIiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NC44OTIgNDUiPjxkZWZzPjxzdHlsZT4uYXtmaWxsOiNmZmY7fS5ie2ZpbGw6I2ZiMWM0NDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgY2xhc3M9ImEiIHdpZHRoPSIzMSIgaGVpZ2h0PSIyNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi45OTkgOSkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48cGF0aCBjbGFzcz0iYiIgZD0iTTcuNDIxLDYuNjc1LDkuNjU3LDQuNTA3VjBIMFY2LjY3NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIyLjM4NSAxNS4yOTUpIi8+PHBhdGggY2xhc3M9ImIiIGQ9Ik0wLDQ1VjBINDQuODkyVjMyLjAxOUwzMS45NjcsNDQuOTc1Wk0xOC4yMDgsMTEuMDgzVjMzLjk0MWg0LjJWMjYuMTgySDMxLjU1bDQuNjkzLTQuNTA4aC4wMjVWMTEuMDgzWm0tOS41NTgsMFYzMy45NDFoNC4yVjExLjA4M1oiLz48L2c+PC9zdmc+"
            alt="IPification Logo"
            className="h-8 w-auto"
          />
          <div className="border-l border-gray-300 pl-4">
            <h1 className="text-lg font-semibold text-gray-900">App Distribution</h1>
            <p className="text-xs text-gray-500">Internal app sharing tool</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">

          {!uploadResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="update-mode"
                    checked={isUpdateMode}
                    onChange={(e) => {
                      setIsUpdateMode(e.target.checked);
                      if (!e.target.checked) {
                        setExistingShareId('');
                      }
                    }}
                    className="w-4 h-4 text-[#fc1c44] border-gray-300 rounded focus:ring-[#fc1c44]"
                  />
                  <label htmlFor="update-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Update existing share link
                  </label>
                </div>

                {isUpdateMode && (
                  <div className="bg-[#fc1c44]/10 dark:bg-rose-900/20 border border-[#fc1c44]/30 dark:border-[#fc1c44]/50 rounded-lg p-4 mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select App to Update
                    </label>
                    {loadingApps ? (
                      <div className="flex items-center gap-2 py-3 text-gray-500 dark:text-gray-400">
                        <div className="w-4 h-4 border-2 border-[#fc1c44] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading apps...</span>
                      </div>
                    ) : existingApps.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
                        No existing apps found. Upload your first app!
                      </p>
                    ) : (
                      <select
                        value={existingShareId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setExistingShareId(selectedId);
                          // Auto-fill app name from selected app
                          const selectedApp = existingApps.find(app => app.id === selectedId);
                          if (selectedApp && !appName) {
                            setAppName(selectedApp.appName);
                          }
                        }}
                        className="w-full px-4 py-3 border border-[#fc1c44]/40 dark:border-[#fc1c44] rounded-lg focus:ring-2 focus:ring-[#fc1c44] focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none bg-white dark:bg-gray-700 cursor-pointer"
                      >
                        <option value="">-- Select an app --</option>
                        {existingApps.map((app) => (
                          <option key={app.id} value={app.id}>
                            {app.appName} (v{app.version}) - {new Date(app.uploadedAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    )}
                    {existingShareId && (
                      <p className="mt-2 text-xs text-[#fc1c44] dark:text-[#fc1c44]/70">
                        Selected: {existingApps.find(app => app.id === existingShareId)?.appName || existingShareId}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="My Awesome App"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fc1c44] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#fc1c44] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    App File
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-6 py-10">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-semibold text-[#fc1c44] dark:text-[#fc1c44] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#fc1c44] focus-within:ring-offset-2 hover:text-[#fc1c44]"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".apk,.ipa,.aab,.exe,.dmg,.pkg,.msi,.deb,.rpm,.appimage"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                        APK, IPA, AAB, EXE, DMG, PKG, MSI, DEB, RPM, AppImage
                      </p>
                      {file && (
                        <div className="mt-2">
                          <p className="text-sm text-[#fc1c44] dark:text-[#fc1c44]">
                            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                          {parsing && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Parsing APK...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!file || uploading || (isUpdateMode && !existingShareId)}
                  className="w-full bg-[#fc1c44] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#fc1c44]/90 focus:outline-none focus:ring-2 focus:ring-[#fc1c44] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : isUpdateMode ? 'Update App' : 'Upload App'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <svg
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {uploadResult.isUpdate ? 'Update Successful!' : 'Upload Successful!'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {uploadResult.isUpdate 
                    ? 'Your app has been updated. The same share link now points to the new version:'
                    : 'Your app has been uploaded. Share this link with your clients:'}
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                      {typeof window !== 'undefined' && window.location.origin}
                      {uploadResult.shareUrl}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}${uploadResult.shareUrl}`
                        )
                      }
                      className="ml-4 px-4 py-2 bg-[#fc1c44] text-white rounded-lg hover:bg-[#fc1c44]/90 transition-colors text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setUploadResult(null);
                      setFile(null);
                      setAppName('');
                      setVersion('');
                      setExistingShareId('');
                      setIsUpdateMode(false);
                    }}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={() => router.push(uploadResult.shareUrl)}
                    className="px-6 py-2 bg-[#fc1c44] text-white rounded-lg hover:bg-[#fc1c44]/90 transition-colors"
                  >
                    View Share Page
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
