/* ========================================================================
   USER ROUTES (KULLANICI ROTALARI)
   Kullanıcı yönetimi ve profil güncelleme endpoint'leri
   ======================================================================== */
import express from 'express';

import { getUsers, updateUser, deleteUser, updateProfile } from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { userEditSchema, profileUpdateSchema } from '@timesheet/shared';

const router = express.Router();

//Profil Güncelleme
router.put('/me', authMiddleware, validate(profileUpdateSchema), updateProfile);

//Kullanıcıları Listele (Sadece Admin)
router.get('/', authMiddleware, adminMiddleware, getUsers);

//Kullanıcı Güncelle (Sadece Admin)
router.put('/:userId', authMiddleware, adminMiddleware, validate(userEditSchema), updateUser);

//Kullanıcı Sil (Sadece Admin)
router.delete('/:userId', authMiddleware, adminMiddleware, deleteUser);

export default router;
