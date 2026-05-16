import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TimesheetDaysColumn from './TimesheetDaysColumn';
import type { MarkerCode } from '@timesheet/shared';

describe('TimesheetDaysColumn Bileşeni', () => {
  const defaultProps = {
    periodDays: ['2024-05-01', '2024-05-02'],
    timesheetDays: {
      '2024-05-01': 'X' as MarkerCode,
    },
    onDayClick: vi.fn(),
  };

  it('verilen günleri buton olarak render etmeli', () => {
    render(<TimesheetDaysColumn {...defaultProps} />);
    
    // 01 ve 02 günleri ekranda görünmeli
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('tıklanan günde onDayClick "X" değeriyle tetiklenmeli', async () => {
    const mockOnClick = vi.fn();
    render(<TimesheetDaysColumn {...defaultProps} onDayClick={mockOnClick} />);
    
    // İçinde '2' yazan elementi bul (2. gün)
    const day2 = screen.getByText('2');
    
    // Elementin container button'una tıklayalım
    await userEvent.click(day2);
    
    expect(mockOnClick).toHaveBeenCalledWith('2024-05-02', 'X');
  });

  it('tatil günleri disable olmalı ve tıklanmamalı', async () => {
    const mockOnClick = vi.fn();
    const isPublicHolidayMock = (dateStr: string) => dateStr === '2024-05-01';

    render(
      <TimesheetDaysColumn
        {...defaultProps}
        onDayClick={mockOnClick}
        isPublicHoliday={isPublicHolidayMock}
      />
    );
    
    const day1Btn = screen.getByText('1').closest('button');
    expect(day1Btn).toBeDisabled();

    if (day1Btn) await userEvent.click(day1Btn);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('sağ tık (context menu) açılabilmeli', () => {
    render(<TimesheetDaysColumn {...defaultProps} />);
    
    const day2Btn = screen.getByText('2').closest('button');
    if (day2Btn) {
      fireEvent.contextMenu(day2Btn);
      // Diğer marker'lar menüde görünmeli
      expect(screen.getByText('R')).toBeInTheDocument();
      expect(screen.getByText('İ')).toBeInTheDocument();
    }
  });
});
