import { useEffect, useRef, RefObject, useState } from "react";

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const observerRef = useRef<MutationObserver | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (!container || !end) return;

    // Function to check if user has scrolled up (manually)
    const checkShouldAutoScroll = () => {
      if (!container) return;

      // Calculate scroll position
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 150; // 150px threshold
      
      // Only change autoScroll state if it's different to avoid re-renders
      if (autoScroll !== scrolledToBottom) {
        setAutoScroll(scrolledToBottom);
      }
    };

    // Throttled scroll handler to improve performance
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        checkShouldAutoScroll();
      }, 100);
    };

    // Perform scroll when new messages are added
    const scrollToBottom = () => {
      if (!autoScroll || !end) return;
      
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        end.scrollIntoView({ behavior: "smooth" });
      });
    };

    // Set up mutation observer to detect changes
    observerRef.current = new MutationObserver((mutations) => {
      // Check if content actually changed
      const hasContentChange = mutations.some(mutation => 
        mutation.type === 'childList' || 
        mutation.type === 'characterData' ||
        mutation.addedNodes.length > 0
      );
      
      if (hasContentChange && autoScroll) {
        scrollToBottom();
      }
    });

    // Start observing content changes
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Add scroll event listener to detect manual scrolling
    container.addEventListener('scroll', handleScroll);

    // Initial scroll to bottom on mount
    scrollToBottom();

    // Clean up
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      container.removeEventListener('scroll', handleScroll);
    };
  }, [autoScroll]);

  // Force scroll to bottom method that can be exposed if needed
  useEffect(() => {
    const scrollToBottomForce = () => {
      if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: "smooth" });
        setAutoScroll(true); // Reset auto-scroll state
      }
    };

    // Add the method to the container element for external access if needed
    if (containerRef.current) {
      (containerRef.current as any).scrollToBottomForce = scrollToBottomForce;
    }
  }, []);

  return [containerRef, endRef];
}
