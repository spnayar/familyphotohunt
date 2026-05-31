import { LoadingSpinner } from './LoadingSpinner';

type LoadingOverlayProps = {
  show: boolean;
  message?: string;
};

export function LoadingOverlay({ show, message }: LoadingOverlayProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 max-w-xs mx-4">
        <LoadingSpinner size="lg" />
        {message ? (
          <p className="text-gray-700 text-sm sm:text-base font-medium text-center">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
