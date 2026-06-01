'use client';

import { useState } from 'react';
import { savePhotosToDevice, isMobileSaveContext } from '@/lib/save-photo-client';

type BulkPhotoSaveButtonProps = {
  items: { downloadUrl: string; filename: string }[];
  className?: string;
  zipFallbackUrl: string;
  zipLabel: string;
  saveLabel?: string;
};

export function BulkPhotoSaveButton({
  items,
  className,
  zipFallbackUrl,
  zipLabel,
  saveLabel,
}: BulkPhotoSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mobile = isMobileSaveContext();

  const defaultSaveLabel =
    saveLabel ?? (mobile ? `Save ${items.length} photos to Photos` : zipLabel);

  const handleSaveAll = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await savePhotosToDevice(items);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not save photos');
    } finally {
      setIsSaving(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {mobile ? (
        <>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={isSaving}
            className={className}
          >
            {isSaving ? 'Preparing…' : defaultSaveLabel}
          </button>
          <a href={zipFallbackUrl} className="text-xs text-gray-500 underline touch-manipulation">
            Or download as .zip (Files app)
          </a>
          {!error && !isSaving && (
            <span className="text-xs text-gray-500">
              In the share menu, scroll and tap Save Images
            </span>
          )}
        </>
      ) : (
        <a href={zipFallbackUrl} className={className}>
          {zipLabel}
        </a>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
