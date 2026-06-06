type IconProps = {
  className?: string;
};

function CameraIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5l-2.2-2.2A2 2 0 0 0 16.4 5.5H14l-1-1.2A1 1 0 0 0 12.2 4h-0.4a1 1 0 0 0-.8.3L9.6 5.5H7.6a2 2 0 0 0-1.4.8L4 8.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function TrophyIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h8v2.5c0 2.5-1.2 4.2-3 5.2V14H9v-2.3C7.2 10.7 6 9 6 6.5V4h2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 18h6v2H9v-2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M5 4H4a1 1 0 0 0-1 1v1.5c0 1.7 1.1 3 2.6 3.4M19 4h1a1 1 0 0 1 1 1v1.5c0 1.7-1.1 3-2.6 3.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V6m0 0 3.5 3.5M12 6 8.5 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function RankIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7h12M8 12h8M8 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 7v0M4 12v0M4 17v0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

type PhotoHuntLogoProps = {
  showTagline?: boolean;
  className?: string;
};

export function PhotoHuntLogo({ showTagline = true, className = '' }: PhotoHuntLogoProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative mb-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/25">
          <CameraIcon className="h-7 w-7 text-white" />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md ring-2 ring-white">
          <TrophyIcon className="h-4 w-4 text-amber-950" />
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        Photo Hunt
      </h1>
      {showTagline && (
        <p className="mt-1.5 text-sm text-gray-600 max-w-xs">
          Themed photo contests for teams, retreats, and groups
        </p>
      )}
    </div>
  );
}

export function PhotoHuntFeatureRow({ className = '' }: { className?: string }) {
  const items = [
    { icon: UploadIcon, label: 'Upload' },
    { icon: RankIcon, label: 'Rank' },
    { icon: TrophyIcon, label: 'Win' },
  ];

  return (
    <div className={`flex items-center justify-center gap-5 text-xs sm:text-sm text-gray-600 ${className}`}>
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}
