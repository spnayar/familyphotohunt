import { useCallback, useState } from 'react';

export function useLoadingAction() {
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(async <T,>(loadingMessage: string, action: () => Promise<T>): Promise<T> => {
    setMessage(loadingMessage);
    try {
      return await action();
    } finally {
      setMessage(null);
    }
  }, []);

  return {
    loadingMessage: message,
    isLoading: message !== null,
    run,
  };
}
