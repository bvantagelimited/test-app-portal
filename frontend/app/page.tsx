'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserMenu } from '@/components/UserMenu';

interface ExistingApp {
  id: string;
  appName: string;
  version: string;
  packageName?: string;
  uploadedAt: string;
  fileSize: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [version, setVersion] = useState('');
  const [packageName, setPackageName] = useState('');
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
  const [isDragging, setIsDragging] = useState(false);
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingAppMatch, setExistingAppMatch] = useState<ExistingApp | null>(null);
  const router = useRouter();

  // Fetch existing apps on mount
  useEffect(() => {
    fetch('/api/apps')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExistingApps(data);
        }
      })
      .catch(err => console.error('Failed to fetch apps:', err));
  }, []);

  const processFile = async (selectedFile: File) => {
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
        
        if (data.packageName) {
          setPackageName(data.packageName);
          
          // Auto-detect existing app by package name
          const existingApp = existingApps.find(app => app.packageName === data.packageName);
          if (existingApp) {
            setIsUpdateMode(true);
            setExistingShareId(existingApp.id);
            setExistingAppMatch(existingApp);
            // Use existing app name to be consistent
            setAppName(existingApp.appName);
          } else {
            setExistingAppMatch(null);
          }
        }

        // Always try to set app name if available and not already set by existing app logic
        if (data.appName && !existingShareId) {
          setAppName(data.appName);
        }
        
        // Set version if parsing was successful
        if (data.success && data.versionName) {
          setVersion(data.versionName);
        }

        // Set icon if available
        if (data.icon) {
          setAppIcon(data.icon);
        }
      } catch (err) {
        // Silently fail - user can still fill manually
        console.error('Failed to parse APK:', err);
      } finally {
        setParsing(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent, forceReplace = false) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    // Check if same version exists and show confirmation
    if (!forceReplace && existingAppMatch && existingAppMatch.version === version) {
      setShowReplaceConfirm(true);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appName', appName || 'Untitled App');
      formData.append('version', version || '1.0.0');
      if (packageName) {
        formData.append('packageName', packageName);
      }
      if (appIcon) {
        formData.append('appIcon', appIcon);
      }
      
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

  const handleConfirmReplace = () => {
    setShowReplaceConfirm(false);
    // Create a synthetic event and call handleSubmit with forceReplace=true
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(syntheticEvent, true);
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Header with Logo and Title */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-4">
            <a
              href="/apps"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Apps
            </a>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">

          {!uploadResult ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              {/* <div className="p-8 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload New App</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Share your app builds instantly</p>
              </div> */}
              
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Auto-detected update notification */}
                  {isUpdateMode && existingShareId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="block text-sm font-semibold text-blue-900 dark:text-blue-100">Updating existing app</span>
                          <span className="block text-xs text-blue-700 dark:text-blue-300">
                            This package already exists. Uploading will update the existing share link.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUpdateMode(false);
                            setExistingShareId('');
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Upload as new
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File Upload Area */}
                  <div>
                    <div 
                      className={`relative group mt-2 flex justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
                        isDragging
                          ? 'border-[#fc1c44] bg-[#fc1c44]/10 dark:bg-[#fc1c44]/20 scale-[1.02]'
                          : file 
                            ? 'border-[#fc1c44] bg-[#fc1c44]/5 dark:bg-[#fc1c44]/10' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-[#fc1c44]/50 hover:bg-gray-50 dark:hover:bg-gray-800'
                      } px-6 py-12`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                    >
                      <div className="text-center w-full">
                        {file ? (
                          <div className="flex flex-col items-center">
                            {appIcon ? (
                              <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg mb-4 ring-2 ring-[#fc1c44]/20">
                                <img src={appIcon} alt="App Icon" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-[#fc1c44]/10 flex items-center justify-center mb-4">
                                <svg className="h-8 w-8 text-[#fc1c44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            )}
                            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-sm">
                              {file.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {parsing && (
                              <div className="flex items-center gap-2 mt-4 text-sm text-[#fc1c44] animate-pulse">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Parsing file info...
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setFile(null);
                                setAppName('');
                                setVersion('');
                                setAppIcon(null);
                              }}
                              className="mt-6 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remove file
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                              <svg
                                className="h-8 w-8 text-gray-400 group-hover:text-[#fc1c44] transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div className="flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md font-semibold text-[#fc1c44] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#fc1c44] focus-within:ring-offset-2 hover:text-[#fc1c44]/80"
                              >
                                <span>Click to upload</span>
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
                            <p className="text-xs leading-5 text-gray-500 dark:text-gray-500 mt-2">
                              APK, IPA, AAB, EXE, DMG, PKG, MSI...
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* App Details Grid - shown after file is selected and parsed */}
                  {file && !parsing && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            App Name
                          </label>
                          <input
                            type="text"
                            value={appName}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Version
                          </label>
                          <input
                            type="text"
                            value={version}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {packageName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Package Name
                          </label>
                          <input
                            type="text"
                            value={packageName}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-200">
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!file || uploading || (isUpdateMode && !existingShareId)}
                    className="w-[250px] mx-auto block relative group overflow-hidden bg-[#fc1c44] text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-[#d9183b] focus:outline-none focus:ring-4 focus:ring-[#fc1c44]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#fc1c44]/30 hover:shadow-[#fc1c44]/50 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          {isUpdateMode ? 'Update App Version' : 'Upload App'}
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-12 text-center">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                  <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {uploadResult.isUpdate ? 'Update Successful!' : 'Upload Successful!'}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
                  {uploadResult.isUpdate 
                    ? 'Your app has been successfully updated. The existing share link now points to this new version.'
                    : 'Your app is ready to share. Send the link below to your team or clients.'}
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 p-2 mb-8 flex items-center shadow-inner">
                  <div className="flex-1 px-4 py-2 overflow-x-auto text-left">
                     <code className="text-sm font-mono text-[#fc1c44] dark:text-[#fc1c44] whitespace-nowrap">
                      {typeof window !== 'undefined' && window.location.origin}
                      {uploadResult.shareUrl}
                    </code>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}${uploadResult.shareUrl}`
                      )
                    }
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                  >
                    Copy Link
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => router.push(uploadResult.shareUrl)}
                    className="px-8 py-3 bg-[#fc1c44] text-white rounded-xl font-bold hover:bg-[#d9183b] shadow-lg shadow-[#fc1c44]/20 transition-all hover:-translate-y-0.5"
                  >
                    View Share Page
                  </button>
                  <button
                    onClick={() => {
                      setUploadResult(null);
                      setFile(null);
                      setAppName('');
                      setVersion('');
                      setPackageName('');
                      setExistingShareId('');
                      setIsUpdateMode(false);
                    }}
                    className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:-translate-y-0.5"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replace Confirmation Modal */}
      {showReplaceConfirm && existingAppMatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Version Already Exists</h3>
              <p className="text-gray-600 text-sm mb-4">
                <strong className="text-gray-900">{existingAppMatch.appName}</strong> version <strong className="text-gray-900">{version}</strong> already exists.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Do you want to replace the existing file with this new upload?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReplaceConfirm(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReplace}
                  className="flex-1 py-3 px-4 bg-[#fc1c44] hover:bg-[#d9183b] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
