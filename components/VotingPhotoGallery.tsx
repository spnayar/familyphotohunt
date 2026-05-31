'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Photo } from '@/types';

type VotingPhotoGalleryProps = {
  photos: Photo[];
  categoryId: string;
  categoryName: string;
  participantId: string;
  selectedPhotoId?: string;
  onVote: (categoryId: string, photoId: string) => void | Promise<void>;
  isVoting: boolean;
  open: boolean;
  startIndex: number;
  onClose: () => void;
};

export function VotingPhotoGallery({
  photos,
  categoryId,
  categoryName,
  participantId,
  selectedPhotoId,
  onVote,
  isVoting,
  open,
  startIndex,
  onClose,
}: VotingPhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(Math.max(startIndex, 0), Math.max(photos.length - 1, 0)));
    }
  }, [open, startIndex, photos.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;

    const deltaX = e.changedTouches[0].clientX - start.x;
    const deltaY = e.changedTouches[0].clientY - start.y;

    touchStartRef.current = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  if (!open || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  const isMyPhoto = currentPhoto.participantId === participantId;
  const isSelected = selectedPhotoId === currentPhoto.id;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-black/80 text-white shrink-0 safe-area-inset-top">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm sm:text-base truncate">{categoryName}</div>
          <div className="text-xs text-gray-300">
            Photo {currentIndex + 1} of {photos.length}
            {isMyPhoto ? ' · Your photo' : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-2xl leading-none touch-manipulation"
          aria-label="Close gallery"
        >
          ×
        </button>
      </div>

      <div
        className="relative flex-1 min-h-0 flex items-center justify-center touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 touch-manipulation"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 touch-manipulation"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}

        <img
          key={currentPhoto.id}
          src={currentPhoto.url}
          alt={`Photo ${currentIndex + 1} for ${categoryName}`}
          className="w-full h-full object-contain select-none"
          draggable={false}
        />

        {photos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 sm:hidden pointer-events-none">
            {photos.map((photo, index) => (
              <span
                key={photo.id}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/90 border-t border-white/10">
        {photos.length > 1 && (
          <p className="text-center text-xs text-gray-400 mb-3 sm:hidden">
            Swipe left or right to browse photos
          </p>
        )}

        {isMyPhoto ? (
          <div className="text-center text-sm text-gray-300 py-3">
            This is your photo — you can&apos;t vote for it.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void onVote(categoryId, currentPhoto.id)}
            disabled={isVoting}
            className={`w-full py-3.5 rounded-xl font-semibold text-base touch-manipulation min-h-[48px] disabled:opacity-50 transition-colors ${
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100'
            }`}
          >
            {isVoting ? 'Saving vote...' : isSelected ? 'Your pick ✓' : 'Vote for this photo'}
          </button>
        )}

        {photos.length > 1 && (
          <div className="hidden sm:flex justify-center gap-2 mt-3 flex-wrap">
            {photos.map((photo, index) => {
              const thumbSelected = selectedPhotoId === photo.id;
              const thumbIsMine = photo.participantId === participantId;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 touch-manipulation ${
                    index === currentIndex
                      ? 'border-white ring-2 ring-blue-400'
                      : thumbSelected
                      ? 'border-blue-400'
                      : 'border-white/30 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View photo ${index + 1}`}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {thumbIsMine && (
                    <span className="absolute inset-0 bg-black/40 text-[8px] text-white flex items-end justify-center pb-0.5">
                      You
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
