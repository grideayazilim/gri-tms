import { http, HttpResponse } from 'msw';

export const defaultHandlers = [
  // Auth endpoints
  http.post('*/api/auth/login', () =>
    HttpResponse.json({
      success: true,
      data: {
        user: {
          id: '1',
          username: 'testuser',
          role: 'ADMIN',
          locationId: null,
          unitId: null,
        },
      },
    }),
  ),

  http.post('*/api/auth/register', () =>
    HttpResponse.json({
      success: true,
      data: { message: 'Kayıt başarılı' },
    }),
  ),

  http.get('*/api/auth/me', () =>
    HttpResponse.json({
      success: true,
      data: {
        user: {
          id: '1',
          username: 'testuser',
          role: 'ADMIN',
          locationId: null,
          unitId: null,
        },
      },
    }),
  ),

  // Announcements
  http.get('*/api/announcements', () =>
    HttpResponse.json({
      success: true,
      data: { announcements: [], unreadCount: 0 },
    }),
  ),

  http.get('*/api/announcements/unread-count', () =>
    HttpResponse.json({ success: true, data: { count: 0 } }),
  ),
];
