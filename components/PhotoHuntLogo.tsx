import Image from 'next/image';

export const PHOTO_HUNT_LOGO_PATH = '/photo-hunt-logo.png';

type PhotoHuntLogoProps = {
  showTagline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-28 w-28 sm:h-32 sm:w-32',
  md: 'h-36 w-36 sm:h-44 sm:w-44',
  lg: 'h-44 w-44 sm:h-52 sm:w-52',
};

export function PhotoHuntLogo({
  showTagline = true,
  className = '',
  size = 'md',
}: PhotoHuntLogoProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <Image
        src={PHOTO_HUNT_LOGO_PATH}
        alt="Photo Hunt — Explore. Capture."
        width={512}
        height={512}
        className={`${sizeClasses[size]} object-contain drop-shadow-md`}
        priority
      />
      {showTagline && (
        <p className="mt-4 text-sm sm:text-base text-gray-600 max-w-sm leading-relaxed">
          Explore, Capture, and Vote on the best photos from your group.
        </p>
      )}
    </div>
  );
}
