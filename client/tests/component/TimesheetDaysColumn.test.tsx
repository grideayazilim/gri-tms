/**
 * TimesheetDaysColumn component tests (Phase 4 — Team B)
 * Coverage:
 *  1. Hafta sonu hücresine --weekend class eklenir
 *  2. Kilitli dönem → hücreler disabled
 *  3. Sol tıklama → onDayClick('X') çağrılır
 *  4. Long press (mobil) → context menü açılır
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import TimesheetDaysColumn from '@/pages/TimesheetPage/TimesheetDaysColumn/TimesheetDaysColumn';

// Framer-motion bypass
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      span: ({ children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span {...rest}>{children}</span>
      ),
    },
  };
});

// Pazar günü = 2026-01-04 (Pazar)
const SUNDAY = '2026-01-04';
// Pazartesi = 2026-01-05
const MONDAY = '2026-01-05';

const defaultProps = {
  period: '2026-01',
  timesheetDays: {} as Record<string, string>,
  periodDays: [SUNDAY, MONDAY],
  onDayClick: vi.fn(),
  isDayCellDirty: undefined,
  isPublicHoliday: undefined,
  isLocked: false,
};

describe('TimesheetDaysColumn', () => {
  it('hafta sonu hücresi --weekend class alır', () => {
    const { container } = render(<TimesheetDaysColumn {...defaultProps} />);
    const buttons = container.querySelectorAll('.ts-day-cell');
    // İlk button SUNDAY (index 0)
    expect(buttons[0]).toHaveClass('ts-day-cell--weekend');
    // İkinci button MONDAY (index 1)
    expect(buttons[1]).not.toHaveClass('ts-day-cell--weekend');
  });

  it('isLocked=true → tüm hücreler disabled', () => {
    const { container } = render(
      <TimesheetDaysColumn {...defaultProps} isLocked={true} />,
    );
    const buttons = container.querySelectorAll('.ts-day-cell');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('sol tıklama → onDayClick(dateStr, "X") çağrılır', () => {
    const onDayClick = vi.fn();
    const { container } = render(
      <TimesheetDaysColumn {...defaultProps} onDayClick={onDayClick} />,
    );
    const mondayButton = container.querySelectorAll('.ts-day-cell')[1];
    fireEvent.click(mondayButton);
    expect(onDayClick).toHaveBeenCalledWith(MONDAY, 'X');
  });

  it('long press 500ms → context menü görünür', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <TimesheetDaysColumn {...defaultProps} />,
    );
    const mondayButton = container.querySelectorAll('.ts-day-cell')[1];

    fireEvent.touchStart(mondayButton, { touches: [{ clientX: 0, clientY: 0 }] });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(container.querySelector('.marker-tooltip')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
