interface ArcinemaIconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export function ArcinemaIcon({ className, style, size = 20 }: ArcinemaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Film frame body */}
      <rect x="1" y="3" width="18" height="14" rx="1.5" fill="currentColor" opacity="0.15" />
      {/* Left perforations */}
      <rect x="1" y="5.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="12" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
      {/* Right perforations */}
      <rect x="15.5" y="5.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
      <rect x="15.5" y="12" width="3.5" height="2.5" rx="0.5" fill="currentColor" />
      {/* Play triangle centered */}
      <path d="M8.5 7.5 L13.5 10 L8.5 12.5 Z" fill="currentColor" />
    </svg>
  );
}
