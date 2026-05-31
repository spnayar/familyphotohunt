import { LoadingSpinner } from './LoadingSpinner';

type PageLoaderProps = {
  message?: string;
};

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center gap-4 p-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 text-base sm:text-lg font-medium">{message}</p>
    </div>
  );
}
