import { useState, useRef, useCallback, useEffect } from 'react';
import { FeedbackState } from '../types';

export function useFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const notify = useCallback(
    (message: string, durationMs: number = 3500) => {
      clearExistingTimer();
      setFeedback(message);
      if (durationMs > 0) {
        timerRef.current = setTimeout(() => {
          setFeedback(null);
          timerRef.current = null;
        }, durationMs);
      }
    },
    [clearExistingTimer]
  );

  useEffect(() => {
    return () => {
      clearExistingTimer();
    };
  }, [clearExistingTimer]);

  return {
    feedback,
    setFeedback,
    notify,
  };
}
