import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tap } from "@/lib/haptics";

export interface YearMonth {
  year: number;
  month: number;
}

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const longMonth = (value: YearMonth) => {
  const label = new Date(value.year, value.month - 1, 1).toLocaleDateString(
    "pt-PT",
    { month: "long" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const step = (value: YearMonth, delta: number): YearMonth => {
  const zero = value.month - 1 + delta;
  return {
    year: value.year + Math.floor(zero / 12),
    month: (((zero % 12) + 12) % 12) + 1,
  };
};

/**
 * Month picker, in a white card with the Painel's shadow. On top, the month large with its year, and on the right one
 * glass pill with the arrows (and "Hoje" when away from this month). Below, the year's twelve months on a light track,
 * like an iOS segmented control that scrolls: the chosen one a raised white pill, this month marked with a dot.
 */
export function MonthStrip({
  value,
  today,
  onSelect,
}: {
  value: YearMonth;
  /** The current month, marked on the track and used by the "Hoje" shortcut. */
  today: YearMonth;
  onSelect: (next: YearMonth) => void;
}) {
  const isToday = value.year === today.year && value.month === today.month;
  const track = useRef<HTMLDivElement>(null);
  const go = (next: YearMonth) => {
    void tap();
    onSelect(next);
  };

  // Keep the chosen month in view on the track (scrolling only the track, never the page).
  useEffect(() => {
    const box = track.current;
    const chip = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !chip) return;
    box.scrollTo({
      left: chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [value.year, value.month]);

  const round =
    "flex size-8 items-center justify-center rounded-full text-onyx transition-colors active:bg-onyx/[0.08]";

  return (
    <div
      className="mt-6 rounded-[22px] bg-card p-4"
      style={{
        boxShadow:
          "0px 1px 3px 0px rgba(0,0,0,0.08), 0px 12px 32px -10px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-subtitle text-[24px] font-semibold leading-tight tracking-tight text-onyx">
            {longMonth(value)}
          </p>
          <p className="tabular font-subtitle text-[13px] font-medium text-muted-dark">
            {value.year}
          </p>
        </div>
        <div className="glass-chip flex shrink-0 items-center gap-0.5 rounded-full p-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => go(step(value, -1))}
            className={round}
          >
            <ChevronLeft size={18} />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => go(today)}
              className="flex h-8 items-center rounded-full px-2.5 font-subtitle text-[12px] font-semibold text-onyx transition-colors active:bg-onyx/[0.08]"
            >
              Hoje
            </button>
          )}
          <button
            type="button"
            aria-label="Mês seguinte"
            onClick={() => go(step(value, 1))}
            className={round}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* The track; the months scroll inside it and fade out at its ends. */}
      <div
        className="mt-3 rounded-full p-1"
        style={{
          background: "color-mix(in srgb, var(--color-onyx) 6%, transparent)",
        }}
      >
        <div
          ref={track}
          role="tablist"
          aria-label={`Meses de ${value.year}`}
          className="flex gap-0.5 overflow-x-auto rounded-full [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MONTHS.map((label, index) => {
            const month = index + 1;
            const active = month === value.month;
            const current = value.year === today.year && month === today.month;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go({ year: value.year, month })}
                className="relative flex h-9 min-w-[3.25rem] flex-none flex-col items-center justify-center rounded-full px-2 font-subtitle text-[13px]"
              >
                {active && (
                  <motion.span
                    layoutId="month-strip-chosen"
                    className="absolute inset-0 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span
                  className={`relative leading-none ${active ? "font-semibold text-onyx" : "font-medium text-muted-dark"}`}
                >
                  {label}
                </span>
                {current && (
                  <span
                    className="relative mt-1 size-1 rounded-full bg-onyx/60"
                    aria-label="este mês"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
