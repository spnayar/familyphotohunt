'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Photo } from '@/types';
import { getPhotoImageUrl } from '@/lib/photo-image';

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

const SWIPE_LOCK_MS = 380;
const TRANSITION_MS = 280;

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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number; lockedAxis: 'x' | 'y' | null } | null>(
    null
  );
  const swipeLockedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setCurrentIndex(Math.min(Math.max(startIndex, 0), Math.max(photos.length - 1, 0)));
      setDragOffset(0);
      setIsDragging(false);
      dragStartRef.current = null;
    }
  }, [open, startIndex, photos.length]);

  const lockSwipe = useCallback(() => {
    swipeLockedRef.current = true;
    window.setTimeout(() => {
      swipeLockedRef.current = false;
    }, SWIPE_LOCK_MS);
  }, []);

  const goPrev = useCallback(() => {
    if (swipeLockedRef.current || photos.length <= 1) return;
    lockSwipe();
    setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length, lockSwipe]);

  const goNext = useCallback(() => {
    if (swipeLockedRef.current || photos.length <= 1) return;
    lockSwipe();
    setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length, lockSwipe]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, goPrev, goNext]);

  useEffect(() => {
    if (!open || photos.length === 0) return;

    const preloadIndexes = [
      (currentIndex + 1) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ];

    for (const index of preloadIndexes) {
      const image = new Image();
      image.src = getPhotoImageUrl(photos[index].id);
    }
  }, [open, currentIndex, photos]);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const start = dragStartRef.current;
      dragStartRef.current = null;
      setIsDragging(false);

      if (!start || swipeLockedRef.current || photos.length <= 1) {
        setDragOffset(0);
        return;
      }

      const deltaX = clientX - start.x;
      const deltaY = clientY - start.y;
      const elapsedMs = Math.max(Date.now() - start.time, 1);
      const width = viewportRef.current?.clientWidth ?? window.innerWidth;
      const velocityX = Math.abs(deltaX) / elapsedMs;

      const isHorizontal =
        start.lockedAxis === 'x' ||
        (start.lockedAxis === null && Math.abs(deltaX) >= Math.abs(deltaY));

      if (!isHorizontal) {
        setDragOffset(0);
        return;
      }

      const distanceThreshold = width * 0.14;
      const shouldAdvance =
        Math.abs(deltaX) >= distanceThreshold || (velocityX >= 0.45 && Math.abs(deltaX) >= 24);

      setDragOffset(0);

      if (!shouldAdvance) return;

      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    },
    [goNext, goPrev, photos.length]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeLockedRef.current || photos.length <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      lockedAxis: null,
    };
    setIsDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || !isDragging) return;

    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;

    if (start.lockedAxis === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      start.lockedAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y';
    }

    if (start.lockedAxis === 'y') {
      setDragOffset(0);
      return;
    }

    const width = viewportRef.current?.clientWidth ?? window.innerWidth;
    const maxDrag = width * 0.45;
    const resisted =
      deltaX < 0 && currentIndex >= photos.length - 1
        ? deltaX * 0.25
        : deltaX > 0 && currentIndex <= 0
          ? deltaX * 0.25
          : deltaX;

    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, resisted)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag(e.clientX, e.clientY);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
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
        ref={viewportRef}
        className="relative flex-1 min-h-0 overflow-hidden select-none"
        style={{ touchAction: photos.length > 1 ? 'none' : 'auto' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 touch-manipulation"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 touch-manipulation"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}

        <div
          className="flex h-full will-change-transform"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : `transform ${TRANSITION_MS}ms ease-out`,
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="h-full w-full shrink-0 flex items-center justify-center px-1"
            >
              <img
                src={getPhotoImageUrl(photo.id)}
                alt={`Photo for ${categoryName}`}
                className="max-h-full max-w-full object-contain pointer-events-none"
                draggable={false}
                decoding="async"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 sm:hidden pointer-events-none z-10">
            {photos.map((photo, index) => (
              <span
                key={photo.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
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
                  <img
                    src={getPhotoImageUrl(photo.id)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
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
