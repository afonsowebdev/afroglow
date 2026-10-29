/**
 * Draggable Widget Grid
 *
 * A grid of cards that can be rearranged by dragging. The layout is a sequence plus a size per card; an exact tiler
 * turns the sequence into a gap-free rectangle at any column count, and Motion animates every change.
 *
 * - Mouse and pen drag immediately. Touch uses a long press, so the page can still be scrolled.
 * - Keyboard: focus a card, hold Alt and use the arrow keys.
 * - In the admin's colours: white cards with a soft shadow and no border (both follow the dark theme).
 */

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { MotionConfig, motion, useDragControls } from 'motion/react'
import { tap } from '@/lib/haptics'

/* Types */

/** Column × row span: `sm` 1×1, `wide` 2×1, `tall` 1×2, `lg` 2×2. */
export type WidgetSize = 'sm' | 'wide' | 'tall' | 'lg'

export interface WidgetItem {
  /** Stable, unique id. */
  id: string
  size: WidgetSize
  /** Accessible name for the card. */
  label?: string
}

export interface DraggableWidgetGridProps<T extends WidgetItem = WidgetItem> {
  /** Initial arrangement. The grid manages the order after mount (remount it with a new `key` to reset). */
  items: T[]
  /** Called with the new order after a drop or a keyboard move. */
  onChange?: (items: T[]) => void
  /** Renders a card's content. */
  renderItem: (item: T, size: WidgetSize) => ReactNode
  /** Enables dragging and keyboard moves. */
  editable?: boolean
  /** Upper bound for the number of columns. */
  maxColumns?: number
  /** Target cell width in px; the column count is derived from it. */
  cellSize?: number
  /** Gap between cards in px. */
  gap?: number
  /** Corner radius of a card in px. */
  radius?: number
  /** Only these column counts are used (e.g. 2, 3, 4 and 6, so a 24-cell board never leaves a hole). */
  allowedColumns?: number[]
  /** Row height as a share of the column width (square by default)… */
  rowRatio?: number
  /** …on a phone-wide grid (under 640px). */
  narrowRowRatio?: number
  /** Rows never taller than this, in px. */
  maxRowHeight?: number
  className?: string
}

const SPANS: { [K in WidgetSize]: { col: number; row: number } } = {
  sm: { col: 1, row: 1 },
  wide: { col: 2, row: 1 },
  tall: { col: 1, row: 2 },
  lg: { col: 2, row: 2 },
}

const SIZE_LABELS: { [K in WidgetSize]: string } = {
  sm: 'pequeno',
  wide: 'largo',
  tall: 'alto',
  lg: 'grande',
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function sizeOf(w: number, h: number): WidgetSize {
  if (w >= 2 && h >= 2) return 'lg'
  if (w >= 2) return 'wide'
  if (h >= 2) return 'tall'
  return 'sm'
}

/* Layout */

interface Placement {
  id: string
  col: number
  row: number
  w: number
  h: number
}

interface Box {
  col: number
  row: number
  w: number
  h: number
}

const overlaps = (a: Box, b: Box) => a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h

const contains = (outer: Box, inner: Box) =>
  inner.col >= outer.col &&
  inner.row >= outer.row &&
  inner.col + inner.w <= outer.col + outer.w &&
  inner.row + inner.h <= outer.row + outer.h

function spanOf(item: WidgetItem, columns: number) {
  return { w: Math.min(SPANS[item.size].col, columns), h: SPANS[item.size].row }
}

/** Places every card. Tries an exact tiling first (no gaps, no stretching); falls back to a row packer that grows cards to close gaps. */
function layout(items: WidgetItem[], columns: number): Placement[] {
  if (columns < 1 || items.length === 0) return []
  return tile(items, columns) ?? pack(items, columns)
}

const TILING_BUDGET = 20000

/** Exact tiling. The first empty cell in reading order takes the earliest card that fits there and still lets the rest be placed. */
function tile(items: WidgetItem[], columns: number): Placement[] | null {
  const spans = items.map((item) => spanOf(item, columns))
  const area = spans.reduce((n, s) => n + s.w * s.h, 0)
  const rows = Math.ceil(area / columns)
  const grid: boolean[] = new Array(rows * columns).fill(false)
  const used: boolean[] = new Array(items.length).fill(false)
  const out: Placement[] = []
  let budget = TILING_BUDGET

  const fits = (w: number, h: number, r: number, c: number) => {
    if (c + w > columns || r + h > rows) return false
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (grid[y * columns + x]) return false
    return true
  }
  const mark = (w: number, h: number, r: number, c: number, v: boolean) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y * columns + x] = v
  }

  const place = (count: number): boolean => {
    if (count === items.length) return true
    if (--budget < 0) return false
    const i = grid.indexOf(false)
    if (i < 0) return false
    const r = Math.floor(i / columns)
    const c = i % columns
    // Cards of the same shape are interchangeable at this cell.
    const tried = new Set<string>()
    for (let k = 0; k < items.length; k++) {
      if (used[k]) continue
      const { w, h } = spans[k]
      const shape = `${w}x${h}`
      if (tried.has(shape) || !fits(w, h, r, c)) continue
      tried.add(shape)
      used[k] = true
      mark(w, h, r, c, true)
      out.push({ id: items[k].id, col: c, row: r, w, h })
      if (place(count + 1)) return true
      out.pop()
      mark(w, h, r, c, false)
      used[k] = false
    }
    return false
  }

  return place(0) ? out : null
}

/** Fallback: fill rows in order, then widen cards to close each row. */
function pack(items: WidgetItem[], columns: number): Placement[] {
  const out: Placement[] = []
  let row = 0
  let queue = items.map((item) => ({ id: item.id, ...spanOf(item, columns) }))

  while (queue.length > 0) {
    const height = Math.max(...queue.slice(0, columns).map((q) => q.h))
    const cells: boolean[] = new Array(height * columns).fill(false)
    const band: Placement[] = []
    const rest: typeof queue = []

    for (const q of queue) {
      let spot = -1
      for (let i = 0; i < cells.length && spot < 0; i++) {
        const r = Math.floor(i / columns)
        const c = i % columns
        if (c + q.w > columns || r + q.h > height) continue
        let free = true
        for (let y = r; y < r + q.h && free; y++) for (let x = c; x < c + q.w && free; x++) if (cells[y * columns + x]) free = false
        if (free) spot = i
      }
      if (spot < 0 || rest.length > 0) {
        rest.push(q)
        continue
      }
      const r = Math.floor(spot / columns)
      const c = spot % columns
      for (let y = r; y < r + q.h; y++) for (let x = c; x < c + q.w; x++) cells[y * columns + x] = true
      band.push({ id: q.id, col: c, row: r, w: q.w, h: q.h })
    }

    // Grow cards right, then down, into any cell left empty.
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue
      const r = Math.floor(i / columns)
      const c = i % columns
      const left = band.find((p) => p.col + p.w === c && p.row <= r && p.row + p.h > r && p.h === 1)
      const above = band.find((p) => p.row + p.h === r && p.col === c && p.w === 1)
      const grow = left ?? above
      if (!grow) continue
      if (grow === left) grow.w += 1
      else grow.h += 1
      cells[i] = true
    }

    out.push(...band.map((p) => ({ ...p, row: p.row + row })))
    row += height
    queue = rest
  }
  return out
}

/** Reorders `items` to match the reading order of their layout. */
function canonical<T extends WidgetItem>(items: T[], columns: number): T[] {
  const places = layout(items, columns)
  if (places.length !== items.length) return items
  const byId = new Map(items.map((item) => [item.id, item]))
  const sorted = [...places].sort((a, b) => a.row - b.row || a.col - b.col).map((p) => byId.get(p.id) as T)
  if (sorted.every((item, i) => item === items[i])) return items
  // Only adopt the reading order when it produces the same layout.
  const at = new Map(places.map((p) => [p.id, p]))
  const same = layout(sorted, columns).every((p) => {
    const q = at.get(p.id)
    return q && q.col === p.col && q.row === p.row && q.w === p.w && q.h === p.h
  })
  return same ? sorted : items
}

function moveTo<T extends WidgetItem>(items: T[], id: string, index: number) {
  const from = items.findIndex((item) => item.id === id)
  if (from < 0 || from === index || index < 0 || index >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(index, 0, moved)
  return next
}

const sameOrder = (a: WidgetItem[], b: WidgetItem[]) => a.length === b.length && a.every((item, i) => item.id === b[i].id)

/* Drop target selection */

/** Viewport rectangle of a card in the settled layout. */
interface Slot {
  left: number
  top: number
  right: number
  bottom: number
}

interface Candidate<T> {
  order: T[]
  slot: Slot
}

/** Fraction of a slot the dragged card's centre must enter to take it. */
const ENTER = 0.18

/**
 * Picks the arrangement whose slot for the dragged card is nearest to its centre, or null to keep the current one.
 * Candidates are measured to a slot shrunk by `ENTER`, the current slot unshrunk, so every accepted move strictly
 * reduces that distance and arrangements can't oscillate.
 */
function choose<T>(home: Slot, candidates: Candidate<T>[], cx: number, cy: number): T[] | null {
  const distance = (s: Slot, inset: number) => {
    const ix = (s.right - s.left) * inset
    const iy = (s.bottom - s.top) * inset
    const dx = Math.max(s.left + ix - cx, 0, cx - (s.right - ix))
    const dy = Math.max(s.top + iy - cy, 0, cy - (s.bottom - iy))
    return Math.hypot(dx, dy)
  }
  const toCentre = (s: Slot) => Math.hypot((s.left + s.right) / 2 - cx, (s.top + s.bottom) / 2 - cy)

  let best = distance(home, 0)
  if (best === 0) return null
  let pick: T[] | null = null
  let bestCentre = Infinity
  for (const { order, slot } of candidates) {
    const d = distance(slot, ENTER)
    const c = toCentre(slot)
    // On a tie the earlier candidate wins; group swaps are listed first.
    if (d < best || (d === best && pick && c < bestCentre)) {
      best = d
      bestCentre = c
      pick = order
    }
  }
  return pick
}

/**
 * Every arrangement one move away: group swaps (a same-shaped area filled entirely by smaller cards trades places with
 * the dragged one, keeping its inner arrangement) and sequence moves (the dragged card takes another index).
 */
function candidatesFor<T extends WidgetItem>(items: T[], id: string, columns: number, toSlot: (box: Box) => Slot): Candidate<T>[] {
  const places = layout(items, columns)
  const me = places.find((p) => p.id === id)
  if (!me) return []
  const byId = new Map(items.map((item) => [item.id, item]))
  const rows = Math.max(...places.map((p) => p.row + p.h))
  const out: Candidate<T>[] = []

  for (let row = 0; row + me.h <= rows; row++) {
    for (let col = 0; col + me.w <= columns; col++) {
      const area = { col, row, w: me.w, h: me.h }
      if (overlaps(area, me)) continue
      const group = places.filter((p) => overlaps(p, area))
      if (group.length < 2 || !group.every((p) => contains(area, p))) continue
      const moved = places.map((p) =>
        p.id === id ? { ...p, col, row } : group.includes(p) ? { ...p, col: p.col - col + me.col, row: p.row - row + me.row } : p,
      )
      moved.sort((a, b) => a.row - b.row || a.col - b.col)
      out.push({ order: moved.map((p) => byId.get(p.id) as T), slot: toSlot(area) })
    }
  }

  const from = items.findIndex((item) => item.id === id)
  for (let i = 0; i < items.length; i++) {
    if (i === from) continue
    const order = moveTo(items, id, i)
    const p = layout(order, columns).find((q) => q.id === id)
    if (p) out.push({ order, slot: toSlot(p) })
  }
  return out
}

/* Motion */

const SPRING = { type: 'spring', visualDuration: 0.38, bounce: 0.16 } as const
const LIFT = { type: 'spring', visualDuration: 0.26, bounce: 0.32 } as const
const LIFT_SCALE = 1.05
/** Minimum time between two reorders during a drag. */
const SETTLE_MS = 40
/** How long the drop outline stays visible. */
const LANDED_MS = 620
/** Touch: hold time before a card lifts. */
const LONG_PRESS_MS = 350
/** Touch: movement allowed during the hold before it counts as a scroll. */
const PRESS_SLOP = 8
// Same number of layers in both, so the shadow can interpolate.
const SHADOW_REST = '0px 1px 3px 0px rgba(0,0,0,0.06), 0px 6px 18px -6px rgba(0,0,0,0.1)'
const SHADOW_LIFTED = '0px 28px 60px -16px rgba(0,0,0,0.35), 0px 10px 24px -8px rgba(0,0,0,0.22)'

/* Card */

interface Press {
  timer: number
  pointerId: number
  x: number
  y: number
}

type Phase = 'idle' | 'holding' | 'lifted'

interface WidgetHandlers {
  start: (id: string) => void
  drag: () => void
  end: (id: string) => void
  key: (e: ReactKeyboardEvent, id: string) => void
  /** True while the click that follows a drop should be ignored. */
  swallow: () => boolean
  /** Ignore the next click (called when a pointer is released after a drag). */
  suppressClick: () => void
}

const Widget = memo(function Widget({
  item,
  col,
  row,
  w,
  h,
  columns,
  rows,
  editable,
  held,
  raised,
  landed,
  handlers,
  hintId,
  position,
  count,
  renderItem,
}: {
  item: WidgetItem
  col: number
  row: number
  w: number
  h: number
  columns: number
  rows: number
  editable: boolean
  held: boolean
  raised: boolean
  landed: boolean
  handlers: WidgetHandlers
  hintId: string
  /** 1-based position in reading order, for assistive technology. */
  position: number
  count: number
  renderItem: (item: never, size: WidgetSize) => ReactNode
}) {
  const controls = useDragControls()
  const node = useRef<HTMLDivElement | null>(null)
  const press = useRef<Press | null>(null)
  const lifted = useRef(false)
  const cleanup = useRef<(() => void) | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  const release = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    lifted.current = false
    cleanup.current?.()
    cleanup.current = null
    setPhase('idle')
  }, [])

  useEffect(() => {
    const el = node.current
    if (!el) return
    // While lifted, touch movement drags the card instead of the page.
    const block = (e: TouchEvent) => {
      if (lifted.current) e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('touchmove', block)
      if (press.current) window.clearTimeout(press.current.timer)
      cleanup.current?.()
    }
  }, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!editable || e.button !== 0 || !e.isPrimary) return
    if (e.pointerType !== 'touch') {
      controls.start(e)
      return
    }
    if (press.current || lifted.current) return
    const origin = e.nativeEvent
    const pointerId = e.pointerId
    setPhase('holding')
    press.current = {
      pointerId,
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null
        lifted.current = true
        setPhase('lifted')
        void tap('medium')
        controls.start(origin)
        const done = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          handlers.suppressClick()
          release()
        }
        window.addEventListener('pointerup', done)
        window.addEventListener('pointercancel', done)
        cleanup.current = () => {
          window.removeEventListener('pointerup', done)
          window.removeEventListener('pointercancel', done)
        }
      }, LONG_PRESS_MS),
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = press.current
    if (p && e.pointerId === p.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > PRESS_SLOP) release()
  }

  const onPointerEnd = (e: ReactPointerEvent) => {
    if (press.current?.pointerId === e.pointerId) release()
  }

  const delay = (col / Math.max(columns, 1) + row / Math.max(rows, 1)) * 0.26

  return (
    <motion.div
      ref={node}
      role="listitem"
      data-slot="widget"
      data-widget-id={item.id}
      tabIndex={editable ? 0 : undefined}
      aria-label={item.label ?? `Cartão ${SIZE_LABELS[item.size]}`}
      aria-describedby={editable ? hintId : undefined}
      aria-posinset={position}
      aria-setsize={count}
      layout="position"
      drag={editable}
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={() => handlers.start(item.id)}
      onDrag={handlers.drag}
      onDragEnd={() => handlers.end(item.id)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => {
        if (phase !== 'idle') e.preventDefault()
      }}
      onKeyDown={(e) => handlers.key(e, item.id)}
      onClickCapture={(e) => {
        if (handlers.swallow() || (editable && (e.target as HTMLElement).closest('a'))) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      animate={{
        scale: phase === 'holding' ? 0.97 : phase === 'lifted' ? LIFT_SCALE : 1,
        boxShadow: phase === 'lifted' ? SHADOW_LIFTED : SHADOW_REST,
      }}
      whileDrag={{ scale: LIFT_SCALE, boxShadow: SHADOW_LIFTED, transition: LIFT }}
      transition={SPRING}
      className={`relative min-w-0 rounded-[var(--widget-radius)] outline-none focus-visible:ring-2 focus-visible:ring-onyx/40 [&_a]:[-webkit-user-drag:none] [&_img]:[-webkit-user-drag:none] ${
        editable ? 'cursor-grab touch-pan-y touch-pinch-zoom select-none [-webkit-touch-callout:none] active:cursor-grabbing' : ''
      }`}
      style={{
        gridColumn: `${col + 1} / span ${w}`,
        gridRow: `${row + 1} / span ${h}`,
        zIndex: held ? 20 : raised ? 10 : 0,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.12, delay }}
        className={`relative isolate flex h-full w-full flex-col overflow-hidden rounded-[var(--widget-radius)] bg-card text-ink ring-inset transition-shadow duration-300 [clip-path:inset(0_round_var(--widget-radius))] ${
          landed ? 'ring-2 ring-accent/60' : ''
        }`}
      >
        {renderItem(item as never, sizeOf(w, h))}
      </motion.div>
    </motion.div>
  )
})

/* Grid */

export function DraggableWidgetGrid<T extends WidgetItem>({
  items: initialItems,
  onChange,
  renderItem,
  editable = true,
  maxColumns = 4,
  cellSize = 215,
  gap = 12,
  radius = 24,
  allowedColumns,
  rowRatio = 1,
  narrowRowRatio,
  maxRowHeight = Infinity,
  className = '',
}: DraggableWidgetGridProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const grid = useRef<HTMLDivElement | null>(null)
  const hintId = useId()
  const minColumns = Math.min(2, Math.max(1, maxColumns))

  const [metrics, setMetrics] = useState({ unit: 0, columns: 0, rowHeight: 0 })
  useIsoLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (width < 1) return
      const wanted = Math.max(minColumns, Math.min(maxColumns, Math.round(width / cellSize)))
      // The largest allowed count that isn't more than the width asks for.
      const columns = allowedColumns?.length
        ? Math.max(...allowedColumns.filter((n) => n <= wanted), Math.min(...allowedColumns))
        : wanted
      const unit = (width - gap * (columns - 1)) / columns
      const ratio = width < 640 && narrowRowRatio ? narrowRowRatio : rowRatio
      const rowHeight = Math.round(Math.min(unit * ratio, maxRowHeight))
      setMetrics((was) =>
        was.columns === columns && Math.abs(was.unit - unit) < 0.5 && was.rowHeight === rowHeight ? was : { unit, columns, rowHeight },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [maxColumns, minColumns, cellSize, gap, allowedColumns, rowRatio, narrowRowRatio, maxRowHeight])

  const columns = metrics.columns || Math.max(minColumns, maxColumns)
  const placements = useMemo(() => layout(items, columns), [items, columns])
  const rows = placements.reduce((n, p) => Math.max(n, p.row + p.h), 0)

  // Latest values for event handlers that outlive a render.
  const latest = useRef({ items, metrics, onChange })
  latest.current.metrics = metrics
  latest.current.onChange = onChange
  useIsoLayoutEffect(() => {
    latest.current.items = items
  }, [items])

  const commit = useCallback((next: T[]) => {
    latest.current.items = next
    setItems(next)
  }, [])

  const toSlot = useCallback(
    (box: Box): Slot => {
      const el = grid.current
      const { unit, rowHeight } = latest.current.metrics
      const rect = el?.getBoundingClientRect()
      const colStep = unit + gap
      const rowStep = rowHeight + gap
      const left = (rect?.left ?? 0) + box.col * colStep
      const top = (rect?.top ?? 0) + box.row * rowStep
      return { left, top, right: left + box.w * colStep - gap, bottom: top + box.h * rowStep - gap }
    },
    [gap],
  )

  /* Drag state. React only re-renders on lift, reorder and drop. */
  const [held, setHeld] = useState<string | null>(null)
  const [raised, setRaised] = useState<string | null>(null)
  const [landed, setLanded] = useState<string | null>(null)
  const dragging = useRef<string | null>(null)
  const startOrder = useRef<T[] | null>(null)
  const frame = useRef(0)
  const lastMove = useRef(0)
  const swallowUntil = useRef(0)
  const ring = useRef(0)
  const refocus = useRef<string | null>(null)

  const step = useCallback(
    (force = false) => {
      frame.current = 0
      const id = dragging.current
      const { items: current, metrics: m } = latest.current
      const el = id ? (grid.current?.querySelector(`[data-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null) : null
      if (!id || !el || !m.columns) return
      const now = performance.now()
      if (!force && now - lastMove.current < SETTLE_MS) {
        // Try again next frame, so a card held still still settles.
        frame.current = requestAnimationFrame(() => step())
        return
      }
      const me = layout(current, m.columns).find((p) => p.id === id)
      if (!me) return
      const r = el.getBoundingClientRect()
      const order = choose(toSlot(me), candidatesFor(current, id, m.columns, toSlot), r.left + r.width / 2, r.top + r.height / 2)
      if (!order) return
      lastMove.current = now
      void tap()
      commit(canonical(order, m.columns))
    },
    [toSlot, commit],
  )

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      window.clearTimeout(ring.current)
    },
    [],
  )

  // Keep keyboard focus on a card after it moves.
  useIsoLayoutEffect(() => {
    const id = refocus.current
    if (!id) return
    refocus.current = null
    const el = grid.current?.querySelector(`[data-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null
    el?.focus()
  }, [items])

  const handlers: WidgetHandlers = useMemo(
    () => ({
      start: (id) => {
        dragging.current = id
        startOrder.current = latest.current.items
        lastMove.current = 0
        setHeld(id)
        setRaised(id)
        // The click fired on release must not reach the card's content.
        window.addEventListener(
          'pointerup',
          () => {
            swallowUntil.current = performance.now() + 300
          },
          { once: true, capture: true },
        )
      },
      drag: () => {
        if (!frame.current) frame.current = requestAnimationFrame(() => step())
      },
      end: (id) => {
        cancelAnimationFrame(frame.current)
        step(true)
        frame.current = 0
        dragging.current = null
        setHeld(null)
        setLanded(id)
        window.clearTimeout(ring.current)
        ring.current = window.setTimeout(() => {
          setLanded(null)
          setRaised(null)
        }, LANDED_MS)
        const before = startOrder.current
        startOrder.current = null
        const after = latest.current.items
        if (before && !sameOrder(before, after)) latest.current.onChange?.(after)
      },
      key: (e, id) => {
        if (!editable || !e.altKey) return
        if ((e.target as HTMLElement).closest('input, textarea, select')) return
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!delta) return
        e.preventDefault()
        const { items: current, metrics: m } = latest.current
        const cols = m.columns || maxColumns
        const from = current.findIndex((item) => item.id === id)
        // Step until the layout actually changes.
        for (let to = from + delta; to >= 0 && to < current.length; to += delta) {
          const next = canonical(moveTo(current, id, to), cols)
          if (sameOrder(next, current)) continue
          refocus.current = id
          commit(next)
          latest.current.onChange?.(next)
          return
        }
      },
      swallow: () => performance.now() < swallowUntil.current,
      suppressClick: () => {
        swallowUntil.current = performance.now() + 300
      },
    }),
    [step, commit, editable, maxColumns],
  )

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  /*
   * DOM order stays fixed; only grid placement changes. Moving elements in the DOM restarts Motion's mount animation,
   * which made rearranged cards fade out and back in. The visual position goes to aria-posinset instead.
   */
  const domOrder = useRef(items.map((item) => item.id))
  for (const item of items) if (!domOrder.current.includes(item.id)) domOrder.current.push(item.id)
  const placementById = new Map(placements.map((p) => [p.id, p]))
  const visualIndex = new Map([...placements].sort((a, b) => a.row - b.row || a.col - b.col).map((p, i) => [p.id, i]))

  return (
    <MotionConfig reducedMotion="user">
      <div className={`relative w-full ${className}`} style={{ '--widget-radius': `${radius}px` } as CSSProperties}>
        {editable && (
          <p id={hintId} className="sr-only">
            Arrasta para mudar de lugar. No telemóvel, mantém o dedo no cartão primeiro. Com teclado, mantém Alt e usa as
            setas.
          </p>
        )}
        <div
          ref={grid}
          role="list"
          data-slot="widget-grid"
          className="grid w-full"
          style={{
            gap,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridAutoRows: metrics.rowHeight ? `${metrics.rowHeight}px` : `minmax(${cellSize * 0.75}px, auto)`,
          }}
        >
          {domOrder.current.map((id) => {
            const item = byId.get(id)
            const p = placementById.get(id)
            if (!item || !p) return null
            return (
              <Widget
                key={id}
                position={(visualIndex.get(id) ?? 0) + 1}
                count={placements.length}
                item={item}
                col={p.col}
                row={p.row}
                w={p.w}
                h={p.h}
                columns={columns}
                rows={rows}
                editable={editable}
                held={held === p.id}
                raised={raised === p.id}
                landed={landed === p.id}
                handlers={handlers}
                hintId={hintId}
                renderItem={renderItem as (item: never, size: WidgetSize) => ReactNode}
              />
            )
          })}
        </div>
      </div>
    </MotionConfig>
  )
}

export default DraggableWidgetGrid
