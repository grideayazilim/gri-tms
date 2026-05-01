/**
 * AnnouncementForm component tests (Phase 4 — Team B)
 * Coverage:
 *  1. Başlık < 3 karakter → validasyon hatası
 *  2. İçerik counter güncellenir
 *  3. Geçerli form → onSubmit çağrılır
 *  4. "Vazgeç" → onCancel çağrılır
 *
 * NOT: AnnouncementForm'daki label'larda htmlFor yoktur; placeholder=' '
 * convention'ına göre elementler getAllByPlaceholderText ile bulunur.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnouncementForm from '@/components/Announcements/AnnouncementForm';

function renderForm(onSubmit = vi.fn(), onCancel = vi.fn()) {
  return render(<AnnouncementForm onSubmit={onSubmit} onCancel={onCancel} />);
}

// Kısa yardımcılar: tüm textbox'lar sırayla title, sonra content textarea
const getTitleInput = () => screen.getAllByRole('textbox')[0] as HTMLInputElement;
const getContentTextarea = () => screen.getAllByRole('textbox')[1] as HTMLTextAreaElement;

describe('AnnouncementForm', () => {
  it('başlık 3 karakterin altında submit → validasyon hatası gösterir', async () => {
    const user = userEvent.setup();
    renderForm();

    const titleInput = getTitleInput();
    await user.clear(titleInput);
    await user.type(titleInput, 'ab'); // 2 karakter < 3
    // submit butonunu tıkla
    await user.click(screen.getByRole('button', { name: /oluştur/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/en az 3/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('içerik alanına yazınca karakter sayıcı güncellenir', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(getContentTextarea(), 'Merhaba');

    expect(screen.getByText(/7 \/ 1000/)).toBeInTheDocument();
  });

  it('geçerli form submit edilince onSubmit çağrılır', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm(onSubmit);

    await user.type(getTitleInput(), 'Test Başlık');
    await user.type(getContentTextarea(), 'Test içerik metni buraya gelir.');
    await user.click(screen.getByRole('button', { name: /oluştur/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Başlık' }),
      expect.anything(),
    );
  });

  it('"Vazgeç" butonuna tıklanınca onCancel çağrılır', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderForm(vi.fn(), onCancel);

    await user.click(screen.getByRole('button', { name: /vazgeç/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});

