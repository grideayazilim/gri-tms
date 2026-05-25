import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Pill from './Pill';

describe('Pill Bileşeni', () => {
  it('etiket metnini (label) doğru şekilde render etmeli', () => {
    const config = {
      label: 'Aktif',
      bg: '#e6f4ea',
      color: '#1e7e34'
    };

    render(<Pill cfg={config} />);

    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('gönderilen renk stillerini (bg ve color) doğru uygulamalı', () => {
    const config = {
      label: 'Hata',
      bg: 'red',
      color: 'white'
    };

    render(<Pill cfg={config} />);

    const pillElement = screen.getByText('Hata');

    // Dinamik renkler hâlâ inline style olarak uygulanır
    expect(pillElement.style.background).toBe('red');
    expect(pillElement.style.color).toBe('white');
  });

  it('pill CSS sınıfını taşımalı', () => {
    const config = { label: 'Test', bg: 'blue', color: 'white' };
    render(<Pill cfg={config} />);

    const pillElement = screen.getByText('Test');

    // Statik stiller artık SCSS sınıfı üzerinden gelir
    expect(pillElement).toHaveClass('pill');
  });
});
