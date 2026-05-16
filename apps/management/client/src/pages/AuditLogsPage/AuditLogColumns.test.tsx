import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { auditLogColumns } from './auditLogColumns';
import type { AuditLogItem } from '@timesheet/shared';

// PopUpColumn mock
vi.mock('./PopUpColumn/PopUpColumn', () => ({
  default: ({ trigger }: { trigger: string }) => <div data-testid="popup-mock">{trigger}</div>,
}));

describe('auditLogColumns (İşlem Kayıtları Tablo Sütunları)', () => {
  const mockRow: AuditLogItem = {
    id: '1',
    action: 'EMPLOYEE_CREATE',
    actorUsername: 'admin_test',
    actorRole: 'ADMIN',
    entityType: 'employees',
    entityId: 'e-1',
    summary: 'Personel oluşturuldu',
    createdAt: '2024-05-17T10:00:00.000Z',
    changes: ['A -> B'],
    metadata: { key: 'val' },
    entityLabel: 'Test',
  };

  it('İşlem Tipi sütunu (index 0) render edilebilmeli', () => {
    const col = auditLogColumns[0];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const { container } = render(col.render(mockRow) as React.ReactElement);
    expect(container).toHaveTextContent('Çalışan Ekleme'); // getAuditActionMeta'dan gelen genel kategori veya etiket (Pill içinde)
  });

  it('İşlemi Yapan sütunu (index 1) render edilebilmeli', () => {
    const col = auditLogColumns[1];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const { container } = render(col.render(mockRow) as React.ReactElement);
    expect(container).toHaveTextContent('admin_test');
    expect(container).toHaveTextContent('(ADMIN)');
  });

  it('İşlem Özeti sütunu (index 2) PopUpColumn render etmeli (hasDetails === true)', () => {
    const col = auditLogColumns[2];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const { getByTestId } = render(col.render(mockRow) as React.ReactElement);
    expect(getByTestId('popup-mock')).toHaveTextContent('Personel oluşturuldu');
  });

  it('İşlem Özeti sütunu (index 2) düz metin render etmeli (hasDetails === false)', () => {
    const col = auditLogColumns[2];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const plainRow: AuditLogItem = { ...mockRow, changes: [], metadata: {} };
    const { container, queryByTestId } = render(col.render(plainRow) as React.ReactElement);

    expect(queryByTestId('popup-mock')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Personel oluşturuldu');
  });

  it('İşlem Tarihi sütunu (index 3) render edilebilmeli', () => {
    const col = auditLogColumns[3];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const { container } = render(col.render(mockRow) as React.ReactElement);
    expect(container).toHaveTextContent('17.05.2024 13:00'); // format 'dd.MM.yyyy HH:mm' (UTC+3)
  });

  it('İşlemi Yapan sutunu — actorUsername ve actorRole yoksa varsayilan gosterilmeli', () => {
    const col = auditLogColumns[1];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const rowWithoutActor: AuditLogItem = { ...mockRow, actorUsername: '', actorRole: '' };
    const { container } = render(col.render(rowWithoutActor) as React.ReactElement);
    expect(container).toHaveTextContent('-');
    expect(container).toHaveTextContent('(Sistem)');
  });

  it('Ozet sutunu — entityLabel yoksa yayilmamali', () => {
    const col = auditLogColumns[2];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const rowNoLabel: AuditLogItem = { ...mockRow, entityLabel: undefined };
    const { getByTestId } = render(col.render(rowNoLabel) as React.ReactElement);
    expect(getByTestId('popup-mock')).toBeInTheDocument();
  });

  it('Ozet sutunu — summary yoksa tire gosterilmeli', () => {
    const col = auditLogColumns[2];
    if (!col || !col.render) throw new Error('Render fonksiyonu yok');

    const rowNoSummary: AuditLogItem = { ...mockRow, summary: '', changes: [], metadata: {} };
    const { container } = render(col.render(rowNoSummary) as React.ReactElement);
    expect(container).toHaveTextContent('-');
  });
});
