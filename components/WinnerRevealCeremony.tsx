'use client';

import { useCallback, useEffect, useState } from 'react';

type WinnerRevealCeremonyProps = {
  categoryName: string;
  photoUrl?: string;
  participantName?: string;
  onComplete: () => void;
};

export function WinnerRevealCeremony({
  categoryName,
  photoUrl,
  participantName,
  onComplete,
}: WinnerRevealCeremonyProps) {
  const [phase, setPhase] = useState<'intro' | 'envelope-open' | 'curtains-open' | 'exit'>('intro');
  const [skipped, setSkipped] = useState(false);

  const finish = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    setPhase('exit');
    window.setTimeout(onComplete, 350);
  }, [onComplete, skipped]);

  useEffect(() => {
    if (skipped) return;

    const envelopeTimer = window.setTimeout(() => setPhase('envelope-open'), 700);
    const curtainTimer = window.setTimeout(() => setPhase('curtains-open'), 2400);
    const finishTimer = window.setTimeout(() => finish(), 4200);

    return () => {
      window.clearTimeout(envelopeTimer);
      window.clearTimeout(curtainTimer);
      window.clearTimeout(finishTimer);
    };
  }, [finish, skipped]);

  return (
    <div
      className={`ceremony-root ${phase === 'exit' ? 'ceremony-exit' : ''} ${
        phase === 'curtains-open' || phase === 'exit' ? 'ceremony-curtains-open' : ''
      } ${phase === 'envelope-open' || phase === 'curtains-open' ? 'ceremony-sparkle-active' : ''}`}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') finish();
      }}
      role="button"
      tabIndex={0}
      aria-label="Skip reveal animation"
    >
      <div className="ceremony-spotlight" aria-hidden />

      <div className={`curtain curtain-left ${phase === 'curtains-open' || phase === 'exit' ? 'curtain-open' : ''}`}>
        <div className="curtain-fold" />
        <div className="curtain-fold" />
        <div className="curtain-fold" />
      </div>
      <div className={`curtain curtain-right ${phase === 'curtains-open' || phase === 'exit' ? 'curtain-open' : ''}`}>
        <div className="curtain-fold" />
        <div className="curtain-fold" />
        <div className="curtain-fold" />
      </div>

      <div className={`ceremony-stage ${phase === 'curtains-open' || phase === 'exit' ? 'ceremony-stage-dim' : ''}`}>
        <p className="ceremony-category">{categoryName}</p>
        <p className="ceremony-tagline">And the winner is...</p>

        <div className={`envelope ${phase === 'envelope-open' || phase === 'curtains-open' || phase === 'exit' ? 'envelope-open' : ''}`}>
          <div className="envelope-back" />
          <div className="envelope-body" />
          <div className="envelope-letter">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="envelope-photo" />
            ) : (
              <span className="envelope-trophy">🏆</span>
            )}
            {participantName && <span className="envelope-name">{participantName}</span>}
          </div>
          <div className="envelope-flap" />
          <div className="envelope-front" />
        </div>

        <div className="ceremony-sparkles" aria-hidden>
          <span>✨</span>
          <span>✨</span>
          <span>✨</span>
        </div>
      </div>

      <p className="ceremony-skip">Tap to skip</p>

      <style jsx>{`
        .ceremony-root {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #1a0a2e 0%, #0d0518 70%);
          cursor: pointer;
          animation: ceremony-fade-in 0.4s ease-out;
          transition: background 0.8s ease;
        }

        .ceremony-curtains-open {
          background: transparent;
          pointer-events: none;
        }

        .ceremony-exit {
          animation: ceremony-fade-out 0.35s ease-in forwards;
          pointer-events: none;
        }

        .ceremony-spotlight {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 50% 60% at 50% 45%,
            rgba(255, 215, 100, 0.18) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        .curtain {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 52%;
          z-index: 70;
          display: flex;
          transition: transform 1.1s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset -8px 0 24px rgba(0, 0, 0, 0.45);
        }

        .curtain-left {
          left: 0;
          background: linear-gradient(90deg, #2d0000 0%, #6b0000 35%, #8b0000 55%, #5a0000 100%);
          transform: translateX(0);
          flex-direction: row;
        }

        .curtain-right {
          right: 0;
          background: linear-gradient(270deg, #2d0000 0%, #6b0000 35%, #8b0000 55%, #5a0000 100%);
          transform: translateX(0);
          flex-direction: row-reverse;
          box-shadow: inset 8px 0 24px rgba(0, 0, 0, 0.45);
        }

        .curtain-open.curtain-left {
          transform: translateX(-105%);
        }

        .curtain-open.curtain-right {
          transform: translateX(105%);
        }

        .curtain-fold {
          flex: 1;
          border-right: 1px solid rgba(0, 0, 0, 0.35);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.06) 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.15) 100%
          );
        }

        .curtain-right .curtain-fold {
          border-right: none;
          border-left: 1px solid rgba(0, 0, 0, 0.35);
        }

        .ceremony-stage {
          position: relative;
          z-index: 65;
          text-align: center;
          padding: 1.5rem;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .ceremony-stage-dim {
          opacity: 0;
          transform: scale(0.92);
          pointer-events: none;
        }

        .ceremony-category {
          font-size: clamp(1.1rem, 4vw, 2rem);
          font-weight: 700;
          color: #f5e6c8;
          margin: 0 0 0.35rem;
          letter-spacing: 0.02em;
        }

        .ceremony-tagline {
          font-size: clamp(1.25rem, 5vw, 2.5rem);
          font-weight: 700;
          color: white;
          margin: 0 0 1.75rem;
          animation: ceremony-pulse 1.5s ease-in-out infinite;
        }

        .envelope {
          position: relative;
          width: clamp(200px, 55vw, 320px);
          height: clamp(140px, 38vw, 220px);
          margin: 0 auto;
          perspective: 800px;
        }

        .envelope-back,
        .envelope-body,
        .envelope-front {
          position: absolute;
          left: 0;
          right: 0;
          border-radius: 4px;
        }

        .envelope-back {
          bottom: 0;
          height: 75%;
          background: linear-gradient(160deg, #a67c00 0%, #d4af37 40%, #b8860b 100%);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        }

        .envelope-body {
          bottom: 0;
          height: 70%;
          background: linear-gradient(180deg, #c9a227 0%, #e8c547 50%, #d4af37 100%);
          clip-path: polygon(0 0, 50% 45%, 100% 0, 100% 100%, 0 100%);
        }

        .envelope-front {
          bottom: 0;
          height: 72%;
          background: linear-gradient(180deg, #ddb82a 0%, #f0d060 60%, #c9a227 100%);
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          z-index: 4;
        }

        .envelope-flap {
          position: absolute;
          top: 18%;
          left: 0;
          right: 0;
          height: 52%;
          background: linear-gradient(180deg, #e8c547 0%, #d4af37 60%, #a67c00 100%);
          clip-path: polygon(0 0, 50% 100%, 100% 0);
          transform-origin: top center;
          transform: rotateX(0deg);
          transition: transform 0.9s cubic-bezier(0.34, 1.2, 0.64, 1);
          z-index: 5;
          backface-visibility: hidden;
        }

        .envelope-open .envelope-flap {
          transform: rotateX(-180deg);
        }

        .envelope-letter {
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: 12%;
          background: linear-gradient(180deg, #fffef8 0%, #f8f4e8 100%);
          border-radius: 6px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          transform: translateY(55%);
          opacity: 0;
          transition: transform 1s cubic-bezier(0.34, 1.2, 0.64, 1) 0.35s,
            opacity 0.6s ease 0.35s;
          z-index: 3;
        }

        .envelope-open .envelope-letter {
          transform: translateY(-35%);
          opacity: 1;
        }

        .envelope-photo {
          width: 100%;
          max-height: 120px;
          object-fit: contain;
          border-radius: 4px;
        }

        .envelope-trophy {
          font-size: 3rem;
          line-height: 1;
        }

        .envelope-name {
          font-size: clamp(0.9rem, 3.5vw, 1.15rem);
          font-weight: 700;
          color: #1a1a2e;
        }

        .ceremony-sparkles {
          position: absolute;
          inset: -2rem;
          pointer-events: none;
        }

        .ceremony-sparkles span {
          position: absolute;
          font-size: 1.5rem;
          opacity: 0;
          animation: ceremony-sparkle 2s ease-in-out infinite;
        }

        .ceremony-sparkles span:nth-child(1) {
          top: 10%;
          left: 15%;
          animation-delay: 1.2s;
        }

        .ceremony-sparkles span:nth-child(2) {
          top: 20%;
          right: 12%;
          animation-delay: 1.6s;
        }

        .ceremony-sparkles span:nth-child(3) {
          bottom: 15%;
          left: 20%;
          animation-delay: 2s;
        }

        .ceremony-sparkle-active .ceremony-sparkles span {
          opacity: 1;
        }

        .ceremony-skip {
          position: absolute;
          bottom: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
          z-index: 80;
        }

        @keyframes ceremony-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes ceremony-fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes ceremony-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.75;
          }
        }

        @keyframes ceremony-sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(20deg);
          }
        }
      `}</style>
    </div>
  );
}
