import express from "express";
import {
	getAllUserExceptMe,
	updateVolunteerStatus,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/getAllUser", getAllUserExceptMe);
router.patch("/updateVolunteerStatus", updateVolunteerStatus);

export default router;
