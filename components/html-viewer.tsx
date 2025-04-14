'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CloudUploadIcon, ExternalLinkIcon, MaximizeIcon, ToggleLeftIcon, ToggleRightIcon, XIcon, Trash2Icon } from 'lucide-react'; // Import icons for modal, upload, and toggle
  
interface HtmlViewerProps {
  htmlContent: string;
  projectId: string | null;
  isUploading: boolean;
  onUpload: () => void;
  uploadResult: { success: boolean; message: string; url?: string } | null;
  isPreviewLoading: boolean; // Added prop for loading state
}

// Define the delete function outside the component
const deleteProject = async (projectId: string) => {
  if (!projectId) return { success: false, message: 'No project ID provided' };
  
  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred during deletion'
    };
  }
};
const HtmlViewer: React.FC<HtmlViewerProps> = ({ htmlContent, projectId, isUploading, onUpload, uploadResult, isPreviewLoading }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement>(null); // Ref for modal iframe
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Removed isUploadModalOpen and isDeployEnabled states
  const [portalHeight, setPortalHeight] = useState<string>('100%'); // Changed to 100% height for full-height display
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);

  // Function to open the modal
  const openModal = () => setIsModalOpen(true);
  // Function to close the modal
  const closeModal = () => setIsModalOpen(false);

  // Effect to calculate portal iframe height (optional, could keep fixed)

  // useEffect(() => {
  //   // Simplified: Using fixed height for portal iframe for consistency
  //   // Calculation logic could be added back if dynamic portal height is desired
  // }, [htmlContent]);

  // Effect to handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Portal View */}
      <div
        className="w-full h-full border rounded-md overflow-hidden border-zinc-200 cursor-pointer group relative flex flex-col" /* Removed dark mode, added h-full and flex-col */
        onClick={openModal}
      >
        <div className="bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 flex-shrink-0 flex justify-between items-center">
          <span>Generated Website Preview</span>
          <div className="flex items-center gap-2">
            {/* Delete button - only show if projectId exists */}
            {projectId && (
              <button
                onClick={async (e) => {
                  e.stopPropagation(); // Prevent modal from opening
                  if (confirm('Are you sure you want to delete this project?')) {
                    setIsDeleting(true);
                    setDeleteResult(null);
                    const result = await deleteProject(projectId);
                    setDeleteResult(result);
                    setIsDeleting(false);
                  }
                }}
                className="px-2 py-0.5 rounded text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                disabled={isDeleting || isUploading}
                title="Delete website"
              >
                <Trash2Icon size={12} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            
            {/* Upload button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent modal from opening
                onUpload(); // Call upload directly
              }}
              className="px-2 py-0.5 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading || isDeleting}
              title="Upload website"
            >
              {isUploading ? 'Uploading...' : 'Deploy'}
            </button>
          </div>
        </div>
        {/* Overlay for hover effect */}
        {/* Overlay for hover effect */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center pointer-events-none"> {/* Added pointer-events-none */}
           <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
             <MaximizeIcon size={14} /> Click to enlarge
           </span>
        </div>
        {/* Stale Indicator Overlay */}
        {isPreviewLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-none">
            <span className="text-zinc-700 text-sm font-medium animate-pulse">Generating new preview...</span>
          </div>
        )}
        <div className="flex-grow overflow-auto"> {/* Added wrapper div with flex-grow */}
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Generated Website Preview Portal"
            sandbox="allow-scripts allow-same-origin"
            width="100%"
            height="100%" /* Changed to 100% height */
            style={{ border: 'none', pointerEvents: 'none' }} /* Removed height from style */
            scrolling="auto" /* Changed to auto to allow scrolling */
          />
        </div>
      </div>

      {/* Modal View */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" /* Kept dark overlay for modal */
          onClick={closeModal} // Close modal on backdrop click
        >
          <div
            className="relative bg-white w-full h-full rounded-lg shadow-xl overflow-hidden flex flex-col" /* Removed dark mode */
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-2 border-b border-zinc-200 flex-shrink-0"> {/* Removed dark mode */}
              <span className="text-sm font-medium text-zinc-700">Website Preview</span> {/* Removed dark mode */}
              <div className="flex items-center gap-2">
                {/* Delete button - only show if projectId exists */}
                {projectId && (
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this project?')) {
                        setIsDeleting(true);
                        setDeleteResult(null);
                        const result = await deleteProject(projectId);
                        setDeleteResult(result);
                        setIsDeleting(false);
                        
                        if (result.success) {
                          closeModal(); // Close the modal if deletion is successful
                        }
                      }
                    }}
                    className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    disabled={isDeleting || isUploading}
                    title="Delete website"
                  >
                    <Trash2Icon size={14} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
                
                {/* Upload button */}
                <button
                  onClick={onUpload} // Call upload directly
                  className="px-3 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading || isDeleting}
                  title="Upload website"
                >
                  {isUploading ? 'Uploading...' : 'Deploy'}
                </button>
                <button
                  onClick={closeModal}
                  className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-200" /* Removed dark mode */
                  aria-label="Close preview"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            {/* Modal Content (Iframe) */}
            {/* Modal Content (Iframe) */}
            <div className="flex-grow overflow-auto relative"> {/* Added relative positioning */}
              <iframe
                ref={modalIframeRef}
                srcDoc={htmlContent}
                title="Generated Website Preview Full"
                sandbox="allow-scripts allow-same-origin"
                width="100%"
                height="100%" // Fill the available space
                style={{ border: 'none' }}
              />
              {/* Stale Indicator Overlay for Modal */}
              {isPreviewLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-none">
                  <span className="text-zinc-700 text-sm font-medium animate-pulse">Generating new preview...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Removed Upload Modal */}
    </>
  );
};

export default HtmlViewer;