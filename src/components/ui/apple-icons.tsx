import type { SVGProps } from 'react'

/*
 * Tab bar icons drawn in the language of Apple's SF Symbols (the ".fill" variants iOS uses in tab bars): solid
 * shapes, rounded corners, details cut out of the shape. Drawn here because SF Symbols themselves may only be
 * used in apps for Apple platforms. All on a 24px grid, coloured by `currentColor`.
 */

type IconProps = SVGProps<SVGSVGElement>

/** Circle as a sub-path, so it can be cut out of a shape with `evenodd`. */
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
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

/** calendar.badge.plus */
export function CalendarPlusFill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.6 2.2a1 1 0 0 1 1 1V5h-2V3.2a1 1 0 0 1 1-1ZM16.4 2.2a1 1 0 0 1 1 1V5h-2V3.2a1 1 0 0 1 1-1Z" />
      <path
        fillRule="evenodd"
        d={
          'M5.8 4h12.4a3.3 3.3 0 0 1 3.3 3.3v10.4a3.3 3.3 0 0 1-3.3 3.3H5.8a3.3 3.3 0 0 1-3.3-3.3V7.3A3.3 3.3 0 0 1 5.8 4Z' +
          // the light band under the binding, as on Apple's calendar
          'M4.3 8.4v.5h15.4v-.5Z' +
          'M11.15 10.6a.85.85 0 0 1 1.7 0v2.4h2.4a.85.85 0 0 1 0 1.7h-2.4v2.4a.85.85 0 0 1-1.7 0v-2.4h-2.4a.85.85 0 0 1 0-1.7h2.4Z'
        }
      />
    </Svg>
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
