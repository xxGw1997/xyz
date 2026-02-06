import { useEffect, useRef } from "react";

interface UseInViewProps {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0,
  rootMargin = "0px",
  once = false,
}: UseInViewProps) {
  const ref = useRef<T>(null);
  const isInViewRef = useRef<boolean>(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;

        if (entry.isIntersecting && once && ref.current) {
          observer.unobserve(ref.current);
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, once]);

  return [ref, isInViewRef] as const;
}
