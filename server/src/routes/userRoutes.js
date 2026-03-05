import express from "express";
import {
    getUsers,
    updateUser,
    deleteUser,
    updateProfile,
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

//Profil Güncelleme
router.put("/me", authMiddleware, updateProfile);

//Kullanıcıları Listele (Sadece Admin)
router.get("/", authMiddleware, adminMiddleware, getUsers);

//Kullanıcı Güncelle (Sadece Admin)
router.put("/:userId", authMiddleware, adminMiddleware, updateUser);

//Kullanıcı Sil (Sadece Admin)
router.delete("/:userId", authMiddleware, adminMiddleware, deleteUser);

export default router;