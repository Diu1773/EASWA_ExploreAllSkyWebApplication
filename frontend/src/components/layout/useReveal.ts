import { useEffect, useRef, useState } from 'react';

/**
 * Reveal-on-scroll: returns a ref to attach to an element and a `revealed`
 * flag that flips true once the element scrolls into view (once, then stops
 * observing). Falls back to immediately visible when IntersectionObserver is
 * unavailable. Pair with the `.reveal` / `.reveal-visible` CSS classes, which
 * are disabled under `prefers-reduced-motion`.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}
