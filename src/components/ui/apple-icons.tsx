import { useId, type SVGProps } from 'react'

/*
 * Menu icons (tab bars and "+" menus of the website and both apps) drawn in the language of Apple's SF Symbols (the ".fill" variants iOS uses in tab bars): solid
 * shapes, rounded corners, details cut out of the shape. Drawn here because SF Symbols themselves may only be
 * used in apps for Apple platforms. All on a 24px grid, coloured by `currentColor`.
 */

/** `size` in px, as lucide icons take it, so either kind can be passed where an icon component is expected. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/** Circle as a sub-path, so it can be cut out of a shape with `evenodd`. */
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

function Svg({ children, size, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width={size} height={size} {...props}>
      {children}
    </svg>
  )
}

/** house.fill */
export function HouseFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.86 2.93a1.8 1.8 0 0 1 2.28 0l7.9 6.42c.62.5.27 1.5-.53 1.5H19.4v8.35a2.3 2.3 0 0 1-2.3 2.3h-2.6v-5.1a1.2 1.2 0 0 0-1.2-1.2h-2.6a1.2 1.2 0 0 0-1.2 1.2v5.1H6.9a2.3 2.3 0 0 1-2.3-2.3v-8.35H3.49c-.8 0-1.15-1-.53-1.5Z" />
    </Svg>
  )
}

/** list.bullet.rectangle.fill */
export function ListRectangleFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          'M6 3.5h12a3.5 3.5 0 0 1 3.5 3.5v10a3.5 3.5 0 0 1-3.5 3.5H6A3.5 3.5 0 0 1 2.5 17V7A3.5 3.5 0 0 1 6 3.5Z' +
          circle(7.4, 8.4, 1.15) +
          circle(7.4, 12, 1.15) +
          circle(7.4, 15.6, 1.15) +
          'M10.4 7.6h7a.8.8 0 0 1 0 1.6h-7a.8.8 0 0 1 0-1.6Z' +
          'M10.4 11.2h7a.8.8 0 0 1 0 1.6h-7a.8.8 0 0 1 0-1.6Z' +
          'M10.4 14.8h7a.8.8 0 0 1 0 1.6h-7a.8.8 0 0 1 0-1.6Z'
        }
      />
    </Svg>
  )
}

/** A calendar page with `badge` cut out of it. */
function Calendar({ badge, ...props }: IconProps & { badge: string }) {
  return (
    <Svg {...props}>
      <path d="M7.6 2.2a1 1 0 0 1 1 1V5h-2V3.2a1 1 0 0 1 1-1ZM16.4 2.2a1 1 0 0 1 1 1V5h-2V3.2a1 1 0 0 1 1-1Z" />
      <path
        fillRule="evenodd"
        d={
          'M5.8 4h12.4a3.3 3.3 0 0 1 3.3 3.3v10.4a3.3 3.3 0 0 1-3.3 3.3H5.8a3.3 3.3 0 0 1-3.3-3.3V7.3A3.3 3.3 0 0 1 5.8 4Z' +
          // the light band under the binding, as on Apple's calendar
          'M4.3 8.4v.5h15.4v-.5Z' +
          badge
        }
      />
    </Svg>
  )
}

/** calendar.badge.plus */
export function CalendarPlusFill(props: IconProps) {
  return (
    <Calendar
      {...props}
      badge="M11.15 10.6a.85.85 0 0 1 1.7 0v2.4h2.4a.85.85 0 0 1 0 1.7h-2.4v2.4a.85.85 0 0 1-1.7 0v-2.4h-2.4a.85.85 0 0 1 0-1.7h2.4Z"
    />
  )
}

/** calendar.badge.checkmark */
export function CalendarCheckFill(props: IconProps) {
  return (
    <Calendar
      {...props}
      badge="M8.3 14.4a.85.85 0 0 1 1.2-1.2l1.65 1.65 3.3-3.7a.85.85 0 0 1 1.27 1.13l-3.9 4.37a.85.85 0 0 1-1.24.04Z"
    />
  )
}

/** photo.on.rectangle.fill */
export function PhotoStackFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M7 3.6h10.6a3.4 3.4 0 0 1 3.4 3.4v8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        fillRule="evenodd"
        d={
          'M5.6 6.6h9.6a2.9 2.9 0 0 1 2.9 2.9v8.7a2.9 2.9 0 0 1-2.9 2.9H5.6a2.9 2.9 0 0 1-2.9-2.9V9.5a2.9 2.9 0 0 1 2.9-2.9Z' +
          circle(7.3, 10.7, 1.45) +
          'M4.5 18.6l3.6-3.9a.9.9 0 0 1 1.32 0l1.9 2.05 1.35-1.4a.9.9 0 0 1 1.3 0l2.33 2.42v.85Z'
        }
      />
    </Svg>
  )
}

/** phone.fill */
export function PhoneFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.94 2.6c.72-.22 1.5.1 1.86.77l1.62 3.04c.33.62.2 1.39-.32 1.86L8.68 9.58a.6.6 0 0 0-.14.7 11.7 11.7 0 0 0 5.18 5.18.6.6 0 0 0 .7-.14l1.31-1.42c.47-.52 1.24-.65 1.86-.32l3.04 1.62c.67.36.99 1.14.77 1.86l-.55 1.8a3.1 3.1 0 0 1-3.32 2.18C10.18 20.5 3.5 13.82 2.96 6.47a3.1 3.1 0 0 1 2.18-3.32Z" />
    </Svg>
  )
}

/** person.crop.circle.fill */
export function PersonCircleFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          circle(12, 12, 9.8) +
          circle(12, 9.4, 3.4) +
          'M5.9 17.75c1.33-2.06 3.57-3.25 6.1-3.25s4.77 1.19 6.1 3.25A7.95 7.95 0 0 1 12 20.6a7.95 7.95 0 0 1-6.1-2.85Z'
        }
      />
    </Svg>
  )
}

/** Outline of an 8-tooth gear, traced once. */
const GEAR = (() => {
  const point = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`
  }
  const [outer, inner] = [10.2, 7.7]
  let d = ''
  for (let k = 0; k < 8; k++) {
    const a = k * 45
    d += `${k ? 'L' : 'M'}${point(inner, a - 13)}L${point(outer, a - 8)}A${outer} ${outer} 0 0 1 ${point(outer, a + 8)}`
    d += `L${point(inner, a + 13)}A${inner} ${inner} 0 0 1 ${point(inner, a + 32)}`
  }
  return `${d}Z`
})()

/** gearshape.fill */
export function GearFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d={GEAR + circle(12, 12, 3.3)} />
    </Svg>
  )
}

/** moon.fill */
export function MoonFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.6 3.2a.7.7 0 0 1 .9.8 7.9 7.9 0 0 0 10.5 10.5.7.7 0 0 1 .8.9A9.4 9.4 0 1 1 8.6 3.2Z" />
    </Svg>
  )
}

/** sun.max.fill */
export function SunFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={circle(12, 12, 4.3)} />
      <path
        d="M12 2.4v1.9M12 19.7v1.9M2.4 12h1.9M19.7 12h1.9M5.2 5.2l1.35 1.35M17.45 17.45l1.35 1.35M5.2 18.8l1.35-1.35M17.45 6.55l1.35-1.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** info.circle.fill */
export function InfoCircleFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          circle(12, 12, 9.8) +
          circle(12, 7.6, 1.25) +
          'M12 10.1a.95.95 0 0 1 .95.95v5.6a.95.95 0 0 1-1.9 0v-5.6a.95.95 0 0 1 .95-.95Z'
        }
      />
    </Svg>
  )
}

/** quote.bubble.fill */
export function QuoteBubbleFill(props: IconProps) {
  const quote = (x: number) =>
    `M${x} 8.1h1.9a.9.9 0 0 1 .9.9v1.6c0 1.5-.8 2.6-2.2 3a.5.5 0 0 1-.6-.6c.2-.5.5-1 .5-1.5H${x}a.9.9 0 0 1-.9-.9V9a.9.9 0 0 1 .9-.9Z`
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          'M7 3.5h10a4.5 4.5 0 0 1 4.5 4.5v4.5a4.5 4.5 0 0 1-4.5 4.5h-5.4l-3.7 3.1c-.6.5-1.4.1-1.4-.7V17A4.5 4.5 0 0 1 2.5 12.5V8A4.5 4.5 0 0 1 7 3.5Z' +
          quote(8.4) +
          quote(13.6)
        }
      />
    </Svg>
  )
}

/** sparkles */
export function SparklesFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 5.5c.4 0 .7.3.8.7.6 3 1.9 4.4 4.9 5 .4.1.7.4.7.8s-.3.7-.7.8c-3 .6-4.3 2-4.9 5-.1.4-.4.7-.8.7s-.7-.3-.8-.7c-.6-3-1.9-4.4-4.9-5-.4-.1-.7-.4-.7-.8s.3-.7.7-.8c3-.6 4.3-2 4.9-5 .1-.4.4-.7.8-.7Z" />
      <path d="M18 2.4c.2 0 .35.12.4.32.32 1.34.86 1.9 2.2 2.22.2.05.32.2.32.4s-.12.35-.32.4c-1.34.32-1.88.88-2.2 2.22-.05.2-.2.32-.4.32s-.35-.12-.4-.32c-.32-1.34-.86-1.9-2.2-2.22-.2-.05-.32-.2-.32-.4s.12-.35.32-.4c1.34-.32 1.88-.88 2.2-2.22.05-.2.2-.32.4-.32Z" />
      <path d="M18.3 15.4c.15 0 .27.1.3.24.22.94.6 1.33 1.54 1.55.14.03.24.15.24.3s-.1.27-.24.3c-.94.22-1.32.61-1.54 1.55-.03.14-.15.24-.3.24s-.27-.1-.3-.24c-.22-.94-.6-1.33-1.54-1.55-.14-.03-.24-.15-.24-.3s.1-.27.24-.3c.94-.22 1.32-.61 1.54-1.55.03-.14.15-.24.3-.24Z" />
    </Svg>
  )
}

/** rectangle.portrait.and.arrow.right.fill */
export function SignOutFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M5.5 3h5.5A2.5 2.5 0 0 1 13.5 5.5v13a2.5 2.5 0 0 1-2.5 2.5H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3ZM8.6 10.5h4.9v3H8.6Z"
      />
      <path
        d="M9.8 12h10.4M17.2 8.7 20.5 12l-3.3 3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** plus (bold), the round menu button */
export function PlusBold(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.6v14.8M4.6 12h14.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  )
}

const BELL =
  'M12 2.6c.6 0 1 .4 1 1v.5a6.3 6.3 0 0 1 5.3 6.2v3.6l1.6 2.4c.4.6 0 1.4-.8 1.4H4.9c-.8 0-1.2-.8-.8-1.4l1.6-2.4v-3.6A6.3 6.3 0 0 1 11 4.1v-.5c0-.6.4-1 1-1ZM9.5 19h5a2.5 2.5 0 0 1-5 0Z'

/** bell.fill */
export function BellFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={BELL} />
    </Svg>
  )
}

/** bell.slash.fill */
export function BellSlashFill(props: IconProps) {
  const id = `bell-slash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <Svg {...props}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" />
        {/* a gap either side of the slash */}
        <path d="M3.4 2.6 21.4 20.6" stroke="black" strokeWidth="4.4" strokeLinecap="round" />
      </mask>
      <path d={BELL} mask={`url(#${id})`} />
      <path d="M3.4 2.6 21.4 20.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  )
}

/** clock.fill */
export function ClockFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          circle(12, 12, 9.8) +
          'M11.1 6.6a.9.9 0 0 1 1.8 0v5.05l3.05 1.8a.9.9 0 1 1-.92 1.55l-3.48-2.06a.9.9 0 0 1-.45-.78Z'
        }
      />
    </Svg>
  )
}

/** person.2.fill */
export function PeopleFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={circle(16.6, 8.4, 2.75)} />
      <path d="M16.9 13.2c2.9.15 4.85 1.95 4.85 4.7 0 .55-.4.95-.95.95h-3.5c.08-.3.1-.6.1-.9 0-1.8-.72-3.45-2.02-4.6.48-.1 1-.15 1.52-.15Z" />
      <path d={circle(9, 7.9, 3.35)} />
      <path d="M2.3 19c0-3.3 2.95-5.6 6.7-5.6s6.7 2.3 6.7 5.6c0 .55-.42.95-.95.95H3.25c-.53 0-.95-.4-.95-.95Z" />
    </Svg>
  )
}

/** scissors */
export function ScissorsFill(props: IconProps) {
  return (
    <Svg {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="6" cy="6.6" r="2.9" />
        <circle cx="6" cy="17.4" r="2.9" />
        <path d="M8.5 8.3 20.5 16.8M8.5 15.7 20.5 7.2" />
      </g>
    </Svg>
  )
}

/** chart.bar.fill */
export function ChartBarFill(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="12" width="4.6" height="8.5" rx="1.5" />
      <rect x="9.7" y="4" width="4.6" height="16.5" rx="1.5" />
      <rect x="15.9" y="8.5" width="4.6" height="12" rx="1.5" />
    </Svg>
  )
}

/** storefront.fill */
export function StorefrontFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.2 3.5h15.6l1.9 5.2c0 1.4-1.1 2.5-2.5 2.5s-2.4-1.1-2.4-2.5c0 1.4-1.1 2.5-2.4 2.5S12 10.1 12 8.7c0 1.4-1.1 2.5-2.4 2.5S7.2 10.1 7.2 8.7c0 1.4-1.1 2.5-2.4 2.5S2.3 10.1 2.3 8.7Z" />
      <path fillRule="evenodd" d="M5 12.7h14v5.8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2ZM10.2 15.1h3.6v5.4h-3.6Z" />
    </Svg>
  )
}

/** lock.fill */
export function LockFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 10.4V7.7a4 4 0 0 1 8 0v2.7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fillRule="evenodd"
        d={
          'M7.6 9.9h8.8a2.8 2.8 0 0 1 2.8 2.8v5.7a2.8 2.8 0 0 1-2.8 2.8H7.6a2.8 2.8 0 0 1-2.8-2.8v-5.7a2.8 2.8 0 0 1 2.8-2.8Z' +
          circle(12, 14.6, 1.45) +
          'M11.35 15.4h1.3v2.3a.65.65 0 0 1-1.3 0Z'
        }
      />
    </Svg>
  )
}

/** The tab bar stays: a screen with its bar in place. */
export function DockFill(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.3 14.6h9.4a1.1 1.1 0 0 1 0 2.2H7.3a1.1 1.1 0 0 1 0-2.2Z" />
    </Svg>
  )
}

/** The tab bar slides away while scrolling: a screen with an arrow down. */
export function DockDownFill(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8.2v6.6M8.9 11.9 12 15l3.1-3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** mappin (filled) */
export function MapPinFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d={
          'M12 2.4a7.1 7.1 0 0 1 7.1 7.1c0 5.05-5.55 10.75-6.38 11.55a1.03 1.03 0 0 1-1.44 0C10.45 20.25 4.9 14.55 4.9 9.5A7.1 7.1 0 0 1 12 2.4Z' +
          circle(12, 9.5, 2.6)
        }
      />
    </Svg>
  )
}
