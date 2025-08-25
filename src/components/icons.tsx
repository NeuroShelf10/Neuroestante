// src/components/icons.tsx
import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { size?: number };

export function BookshelfIcon({ size = 48, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      {/* estante estilizada */}
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <rect x="6" y="7" width="12" height="1.6" fill="white" />
      <rect x="6" y="15" width="12" height="1.6" fill="white" />
      {/* livros */}
      <rect x="6.5" y="4.5" width="2" height="3.5" rx="0.5" fill="white" />
      <rect x="9.2" y="4.5" width="3.2" height="3.5" rx="0.5" fill="white" />
      <rect x="14.6" y="12" width="2" height="3" rx="0.5" fill="white" transform="rotate(12 14.6 12)" />
      <rect x="6.8" y="16.8" width="4.8" height="2.2" rx="0.5" fill="white" />
    </svg>
  );
}

export function UsersIcon({ size = 48, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.8 19c.6-3.3 3-5 5.2-5s4.6 1.7 5.2 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="16.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 18.5c.5-2.2 2.2-3.3 3.8-3.3 1.6 0 3.3 1.1 3.8 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export function LinkIcon({ size = 48, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M8.5 12a3.5 3.5 0 013.5-3.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15.5 12a3.5 3.5 0 01-3.5 3.5h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="4" y="9" width="7" height="6" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="13" y="9" width="7" height="6" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

export function BrainIcon({ size = 48, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M8.5 3.5a3 3 0 00-3 3v1.2a3 3 0 00-1.5 2.6v2.9A3.8 3.8 0 007.8 17H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15.5 3.5a3 3 0 013 3v1.2a3 3 0 011.5 2.6v2.9A3.8 3.8 0 0116.2 17H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 6.5c1.2 0 2 .8 2 2v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15 6.5c-1.2 0-2 .8-2 2v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="10" r="7.5" opacity="0.08" fill="currentColor"/>
    </svg>
  );
}

export function UserIcon({ size = 48, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 19c1-3.5 4-5.5 7.5-5.5S18.5 15.5 19.5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
