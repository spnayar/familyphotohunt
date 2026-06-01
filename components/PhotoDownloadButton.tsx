'use client';

import { useState } from 'react';
import { savePhotoToDevice, isMobileSaveContext } from '@/lib/save-photo-client';

type PhotoDownloadButtonProps = {
  downloadUrl: string;
  filename: string;
  className?: string;
  label?: string;
};

export function PhotoDownloadButton({
  downloadUrl,
  filename,
  className = 'inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 touch-manipulation min-h-[44px] leading-[44px]',
  label,
}: PhotoDownloadButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel = isMobileSaveContext() ? 'Save to Photos' : 'Download full size';

  const handleClick = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await savePhotoToDevice(downloadUrl, filename);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not save photo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <span className="block">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSaving}
        className={`${className} disabled:opacity-60 disabled:cursor-wait bg-transparent border-0 p-0 text-left`}
      >
        {isSaving ? 'Preparing…' : (label ?? defaultLabel)}
      </button>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
      {isMobileSaveContext() && !error && !isSaving && (
        <span className="block text-xs text-gray-500 mt-0.5">
          Choose Save Image in the share menu
        </span>
      )}
    </span>
  );
}
