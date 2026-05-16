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
    
    // getComputedStyle ile stilleri kontrol ediyoruz
    expect(pillElement.style.backgroundColor).toBe('red');
    expect(pillElement.style.color).toBe('white');
  });

  it('görsel tasarım özelliklerini (border-radius, font-size vb.) korumalı', () => {
    const config = { label: 'Test', bg: 'blue', color: 'white' };
    render(<Pill cfg={config} />);

    const pillElement = screen.getByText('Test');
    
    // Satır içi (inline) stilleri kontrol ediyoruz
    expect(pillElement.style.borderRadius).toBe('999px');
    expect(pillElement.style.fontSize).toBe('12px');
    expect(pillElement.style.fontWeight).toBe('600');
  });
});
