'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MaximizeIcon, XIcon } from 'lucide-react'; // Import icons for modal

interface HtmlViewerProps {
  htmlContent: string;
}

const HtmlViewer: React.FC<HtmlViewerProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalIframeRef = useRef<HTMLIFrameElement>(null); // Ref for modal iframe
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [portalHeight, setPortalHeight] = useState<string>('250px'); // Fixed height for portal

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
        className="w-full my-4 border rounded-md overflow-hidden dark:border-zinc-700 cursor-pointer group relative"
        onClick={openModal}
      >
        <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Generated Website Preview
        </div>
        {/* Overlay for hover effect */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center">
           <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
             <MaximizeIcon size={14} /> Click to enlarge
           </span>
        </div>
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          title="Generated Website Preview Portal"
          sandbox="allow-scripts allow-same-origin"
          width="100%"
          style={{ height: portalHeight, border: 'none', pointerEvents: 'none' }} // Disable pointer events on portal iframe
          scrolling="no" // Disable scrolling on portal
        />
      </div>

      {/* Modal View */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={closeModal} // Close modal on backdrop click
        >
          <div
            className="relative bg-white dark:bg-zinc-900 w-full h-full rounded-lg shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-2 border-b dark:border-zinc-700 flex-shrink-0">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Website Preview</span>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                aria-label="Close preview"
              >
                <XIcon size={18} />
              </button>
            </div>
            {/* Modal Content (Iframe) */}
            <div className="flex-grow overflow-auto">
              <iframe
                ref={modalIframeRef}
                srcDoc={htmlContent}
                title="Generated Website Preview Full"
                sandbox="allow-scripts allow-same-origin"
                width="100%"
                height="100%" // Fill the available space
                style={{ border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HtmlViewer;