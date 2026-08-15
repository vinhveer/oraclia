import type { SVGProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Self-contained icon set drawn on the Material 24dp grid (2px stroke, round
 * joins). Bundled as paths rather than an icon font so the kit has no network
 * dependency and inherits `currentColor` everywhere.
 */
const paths = {
  add: <path d="M12 5v14M5 12h14" />,
  remove: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5 10-10" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  chevronUp: <path d="M6 14.5l6-6 6 6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  arrowRight: <path d="M4 12h15m0 0l-6-6m6 6l-6 6" />,
  arrowLeft: <path d="M20 12H5m0 0l6-6m-6 6l6 6" />,
  arrowBack: <path d="M20 12H5m0 0l6-6m-6 6l6 6" />,
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6" />
    </>
  ),
  favorite: (
    <path d="M12 20s-7.5-4.7-7.5-9.4A4.1 4.1 0 0112 8.4a4.1 4.1 0 017.5 2.2C19.5 15.3 12 20 12 20z" />
  ),
  star: (
    <path d="M12 4l2.5 5.1 5.5.8-4 3.9.95 5.6L12 16.8 7.05 19.4 8 13.8 4 9.9l5.5-.8z" />
  ),
  bookmark: <path d="M6.5 4h11v16l-5.5-4-5.5 4z" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
    </>
  ),
  group: (
    <>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      <path d="M16 6.2a3.2 3.2 0 010 6M17.5 14.9c2 .6 3.5 2.1 3.5 4.6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.8 7.5l7.2 5a1.8 1.8 0 002 0l7.2-5" />
    </>
  ),
  notifications: (
    <>
      <path d="M6.5 17V11a5.5 5.5 0 0111 0v6" />
      <path d="M4.8 17h14.4" />
      <path d="M10 20h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  folder: <path d="M3.5 7a2 2 0 012-2h3.4l2 2.4h7.6a2 2 0 012 2v8.6a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5l4.6-4.3 3.4 3 3-2.6 4 3.6" />
    </>
  ),
  delete: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 011-1h3a1 1 0 011 1v1.7" />
      <path d="M6.5 6.5l.9 12a1.5 1.5 0 001.5 1.4h6.2a1.5 1.5 0 001.5-1.4l.9-12" />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 19.5h4l10-10a2.1 2.1 0 00-3-3l-10 10z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5.8" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="18.2" r="2.6" />
      <path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" />
    </>
  ),
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M4.5 19.5h15" />,
  upload: <path d="M12 20V9m0 0L8 13m4-4l4 4M4.5 4.5h15" />,
  more: (
    <>
      <circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M4 6h16l-6 7v6l-4-2v-4z" />,
  tune: (
    <>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </>
  ),
  visibility: (
    <>
      <path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  visibilityOff: (
    <>
      <path d="M6.4 6.9C4.2 8.4 2.8 12 2.8 12s3.4 6 9.2 6c2 0 3.7-.7 5.1-1.6M9.9 6.3A9.4 9.4 0 0112 6c5.8 0 9.2 6 9.2 6a17 17 0 01-2.6 3.2" />
      <path d="M9.9 9.9a2.8 2.8 0 004 4M4 4l16 16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.5l8.5 15h-17z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  lightMode: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" />
    </>
  ),
  darkMode: <path d="M20 13.5A8 8 0 0110.5 4a8.4 8.4 0 100 19 8.4 8.4 0 009.5-9.5z" />,
  palette: (
    <>
      <path d="M12 3.5c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5c1.4 0 2.2-.9 2.2-2 0-1.5-1.2-1.7-1.2-2.9 0-1 .8-1.6 1.9-1.6h1.6c2.3 0 4-1.7 4-4.1 0-3.5-3.7-6.4-8.5-6.4z" />
      <circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  widgets: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  textFields: <path d="M4 7V5.5h9V7M8.5 5.5v13M11.5 12v-1h8.5v1M15.75 11v7.5" />,
  toggle: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="16.5" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  layers: <path d="M12 3.8l8.5 4.4-8.5 4.4-8.5-4.4zM4.5 12.4l7.5 3.9 7.5-3.9M4.5 16.4l7.5 3.9 7.5-3.9" />,
  play: <path d="M8 5.5l10 6.5-10 6.5z" />,
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 11-2.4-5.5m1 .5V4m0 3h-3" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),
  logout: <path d="M14 6V4.5h-9v15h9V18M10.5 12h9.5m0 0l-3.5-3.5M20 12l-3.5 3.5" />,
  sparkle: (
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  ),
} as const

export type IconName = keyof typeof paths

export const iconNames = Object.keys(paths) as IconName[]

/**
 * Only icons drawn as a single closed silhouette read correctly when filled —
 * filling an open path (an arc, a set of strokes) collapses it into a blob, so
 * `filled` is ignored for everything else.
 */
const fillable = new Set<IconName>([
  'favorite',
  'star',
  'bookmark',
  'home',
  'play',
  'folder',
  'sparkle',
  'darkMode',
  'filter',
])

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Rendered box in px. Material's default optical size is 24. */
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 24, filled = false, className, ...rest }: IconProps) {
  const solid = filled && fillable.has(name)

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={solid ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
