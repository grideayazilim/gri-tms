import bcrypt from "bcrypt";
import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";

// GET /users
export async function getUsers(req, res) {
    try {
        const {
            role,
            status,
            unitId,
            locationId,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const offset = (page - 1) * limit;

        const result = await withTransaction(async (client) => {
            let queryStr = `
        SELECT 
          u.id, 
          u.username, 
          u.role, 
          u.status, 
          u.expiry_date as "expiryDate", 
          u.created_at as "createdAt",
          un.id AS unit_id, 
          un.name AS unit_name,
          l.id AS location_id, 
          l.name AS location_name
        FROM app.users u
        LEFT JOIN app.units un ON u.unit_id = un.id
        LEFT JOIN app.locations l ON u.location_id = l.id
        WHERE 1=1
      `;
            const queryParams = [];
            let paramCount = 1;

            if (role) {
                queryStr += ` AND u.role = $${paramCount}`;
                queryParams.push(role);
                paramCount++;
            }
            if (status) {
                queryStr += ` AND u.status = $${paramCount}`;
                queryParams.push(status);
                paramCount++;
            }
            if (unitId) {
                queryStr += ` AND u.unit_id = $${paramCount}`;
                queryParams.push(unitId);
                paramCount++;
            }
            if (locationId) {
                queryStr += ` AND u.location_id = $${paramCount}`;
                queryParams.push(locationId);
                paramCount++;
            }
            if (search) {
                queryStr += ` AND u.username ILIKE $${paramCount}`;
                queryParams.push(`%${search}%`);
                paramCount++;
            }

            // Pagination
            const countQueryStr = `SELECT COUNT(*) FROM (${queryStr}) as total`;
            const countResult = await client.query(countQueryStr, queryParams);
            const totalCount = parseInt(countResult.rows[0].count, 10);

            
            queryStr += ` ORDER BY u.username ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            queryParams.push(limit, offset);

            const dataResult = await client.query(queryStr, queryParams);

            return {
                users: dataResult.rows,
                total: totalCount
            };
        });

        // Veriyi map'le
        const parsedUsers = result.users.map(row => {
            let unitObj = null;
            if (row.unit_id || row.location_id) {
                unitObj = {
                    id: row.unit_id || null,
                    name: row.unit_name || null,
                    location: row.location_id ? {
                        id: row.location_id,
                        name: row.location_name
                    } : null
                };
            }

            return {
                id: row.id,
                username: row.username,
                role: row.role,
                status: row.status,
                unit: unitObj,
                expiryDate: row.expiryDate,
                createdAt: row.createdAt
            };
        });

        res.json({
            success: true,
            data: {
                users: parsedUsers,
                pagination: {
                    total: result.total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages: Math.ceil(result.total / limit)
                }
            }
        });

    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcılar getirilirken bir hata oluştu.'
        });
    }
}

// PUT /users/:userId
export async function updateUser(req, res) {
    try {
        const { userId } = req.params;
        const { role, status, unitId, locationId, expiryDate } = req.body;

        if (role === 'RESPONSIBLE' && (!unitId || !locationId)) {
            return res.status(400).json({
                success: false,
                message: 'Birim sorumlusu (RESPONSIBLE) için birim ve yerleşke seçimi zorunludur.'
            });
        }

        const result = await withTransaction(async (client) => {
        
            const userCheck = await client.query('SELECT * FROM app.users WHERE id = $1', [userId]);
            if (userCheck.rows.length === 0) {
                return null; 
            }

            const existingUser = userCheck.rows[0];

            // Değerleri alma
            const newRole = role !== undefined ? role : existingUser.role;
            const newUnitId = unitId !== undefined ? unitId : existingUser.unit_id;
            const newLocationId = locationId !== undefined ? locationId : existingUser.location_id;
            const newExpiryDate = expiryDate !== undefined ? expiryDate : existingUser.expiry_date;
            
            let newStatus = status !== undefined ? status : existingUser.status;
            
            // Eğer ADMIN ise expiryDate her zaman null olmalı
            if (newRole === 'ADMIN') {
                newExpiryDate = null;
            }

            // Eğer expiryDate geçmişse otomatik olarak EXPIRED yap.
            // Eğer status EXPIRED ve expiryDate gelecekteyse (veya yoksa) ACTIVE yap.
            if (newExpiryDate && new Date(newExpiryDate) < new Date()) {
                newStatus = 'EXPIRED';
            } else if (newStatus === 'EXPIRED' && (!newExpiryDate || new Date(newExpiryDate) >= new Date())) {
                newStatus = 'ACTIVE';
            }

            const updateQuery = `
        UPDATE app.users 
        SET 
          role = $1,
          status = $2,
          unit_id = $3,
          location_id = $4,
          expiry_date = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;

            return await client.query(updateQuery, [
                newRole,
                newStatus,
                newUnitId,
                newLocationId,
                newExpiryDate,
                userId
            ]);
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: toCamelCase(result.rows[0])
        });

    } catch (error) {
        console.error('updateUser error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı güncellenirken bir hata oluştu.'
        });
    }
}

// DELETE /users/:userId
export async function deleteUser(req, res) {
    try {
        const { userId } = req.params;

        const result = await withTransaction(async (client) => {
            return await client.query(
                'DELETE FROM app.users WHERE id = $1 RETURNING id',
                [userId]
            );
        });

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Silinecek kullanıcı bulunamadı.'
            });
        }

        res.json({
            success: true,
            message: 'Kullanıcı başarıyla silindi.'
        });

    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı silinirken bir hata oluştu.'
        });
    }
}

// PUT /users/me
export async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const { username, oldPassword, newPassword } = req.body;

        const result = await withTransaction(async (client) => {
            // Şifre kontrolü
            const currUser = await client.query(
                'SELECT id, password_hash FROM app.users WHERE id = $1',
                [userId]
            );

            if (currUser.rows.length === 0) {
                return { error: 'NOT_FOUND' };
            }

            const user = currUser.rows[0];
            let newPasswordHash = user.password_hash;

            if (oldPassword && newPassword) {
                // Şifre doğrulaması
                const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
                if (!isMatch) {
                    return { error: 'INVALID_PASSWORD' };
                }
                // Yeni şifre
                newPasswordHash = await bcrypt.hash(newPassword, 10);
            } else if (oldPassword || newPassword) {
                return { error: 'MISSING_PASSWORD_FIELDS' };
            }

            const updateResult = await client.query(
                `UPDATE app.users 
         SET 
           username = COALESCE($1, username),
           password_hash = $2,
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, username, role, status, unit_id, location_id, created_at, updated_at`,
                [username || null, newPasswordHash, userId]
            );

            return { user: updateResult.rows[0] };
        });

        if (result.error === 'NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }
        if (result.error === 'INVALID_PASSWORD') {
            return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı.' });
        }
        if (result.error === 'MISSING_PASSWORD_FIELDS') {
            return res.status(400).json({ success: false, message: 'Şifre değiştirmek için eski ve yeni şifre birlikte gereklidir.' });
        }

        res.json({
            success: true,
            data: toCamelCase(result.user),
            message: 'Profil başarıyla güncellendi.'
        });

    } catch (error) {
        console.error('updateProfile error:', error);

        // Username kullanımdaysa
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Bu kullanıcı adı zaten kullanımda.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Profil güncellenirken bir hata oluştu.'
        });
    }
}
