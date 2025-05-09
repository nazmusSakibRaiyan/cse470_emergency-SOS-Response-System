import express from "express";
import { broadcastMessage, getAllBroadcasts } from "../controllers/broadcastController.js";

const router = express.Router();

router.post("/", broadcastMessage);
router.get("/", getAllBroadcasts);


export default router;

