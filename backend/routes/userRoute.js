import express from "express";
import { getAllUserExceptMe } from "../controllers/userController.js";

const router = express.Router();

router.post("/getAllUser", getAllUserExceptMe);

export default router;
