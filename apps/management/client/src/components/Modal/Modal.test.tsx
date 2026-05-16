// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal';

/*
  Modal bileşeni:
  - Başlık (title) ve içerik (content) render eder
  - Sağ üstteki (✕) kapatma butonuna tıklanınca onClose çağrılır
  - Arka plana (overlay) tıklanınca onClose çağrılır
  - ESC tuşuna basılınca onClose çağrılır
  - showCloseButton={false} olunca kapatma butonu görünmez
  - content fonksiyon da olabilir: (onClose) => ReactNode
*/
describe('Modal bileşeni', () => {
  it('başlık ve içerik doğru render edilmeli', () => {
    render(
      <Modal
        title="Test Başlığı"
        content={<p>Modal içeriği burada</p>}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Test Başlığı')).toBeInTheDocument();
    expect(screen.getByText('Modal içeriği burada')).toBeInTheDocument();
  });

  it('kapatma (✕) butonu görünmeli ve tıklanınca onClose çağrılmalı', () => {
    const onClose = vi.fn();

    render(
      <Modal
        title="Test"
        content="İçerik"
        onClose={onClose}
      />
    );

    // aria-label="Kapat" olan butonu bul
    const closeBtn = screen.getByRole('button', { name: 'Kapat' });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('showCloseButton={false} olunca kapatma butonu görünmemeli', () => {
    render(
      <Modal
        title="Test"
        content="İçerik"
        showCloseButton={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Kapat' })).not.toBeInTheDocument();
  });

  it('ESC tuşuna basılınca onClose çağrılmalı', () => {
    const onClose = vi.fn();

    render(
      <Modal
        title="Test"
        content="İçerik"
        onClose={onClose}
      />
    );

    // Pencereye Escape key eventi gönder
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('content fonksiyon olduğunda onClose parametresiyle doğru render edilmeli', () => {
    const onClose = vi.fn();

    render(
      <Modal
        title="Fonksiyon İçerik"
        // content render fonksiyonu: kendi içinden onClose çağırabilir
        content={(close) => (
          <button onClick={() => close('sonuç')}>Kaydet</button>
        )}
        onClose={onClose}
      />
    );

    const saveBtn = screen.getByRole('button', { name: 'Kaydet' });
    expect(saveBtn).toBeInTheDocument();

    fireEvent.click(saveBtn);
    // content içindeki close('sonuç') çağrısı onClose'u tetiklemeli
    expect(onClose).toHaveBeenCalledWith('sonuç');
  });

  it('modal container içine tıklamak onClose u tetiklememeli (yalnızca overlay tetikler)', () => {
    const onClose = vi.fn();

    render(
      <Modal
        title="Test"
        content={<div data-testid="inner-content">İçerik</div>}
        onClose={onClose}
      />
    );

    // İç içeriğe tıkla — onClose çağrılmamalı
    fireEvent.click(screen.getByTestId('inner-content'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
