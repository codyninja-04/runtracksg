import Link from 'next/link'

// A track lane with the sun sitting on the line. Reads as "running" and
// "heat" at favicon size.
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#16A34A" />
      <circle cx="21.5" cy="11" r="4.2" fill="#FDE68A" />
      <path d="M5 23.5c5-6 10.5-9 22-9.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M5 27.5c5.5-5 11-7 22-7.2" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="RunTrackSG home">
      <LogoMark />
      <span className="font-display text-[1.35rem] font-semibold uppercase tracking-wide text-ink">
        RunTrack<span className="text-primary">SG</span>
      </span>
    </Link>
  )
}
