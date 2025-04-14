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
  const [portalHeight, setPortalHeight] = useState<string>('100%'); // Changed to 100% height for full-height display

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
        <div className="bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 flex-shrink-0"> {/* Removed dark mode, added flex-shrink-0 */}
          Generated Website Preview
        </div>
        {/* Overlay for hover effect */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center">
           <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
             <MaximizeIcon size={14} /> Click to enlarge
           </span>
        </div>
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
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-200" /* Removed dark mode */
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