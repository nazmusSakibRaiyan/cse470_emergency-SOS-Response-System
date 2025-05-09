import express from "express";
import {
	sendSoftSOS,
    sendSilentSOS,
	setAsResolved,
	getAllNonResolvedSOS,
	getAllMySOS,
	acceptSOS,
} from "../controllers/sosController.js";

const router = express.Router();

router.post("/sendSoftSOS", sendSoftSOS);
router.post("/sendSilentSOS", sendSilentSOS);
router.post("/setAsResolved", setAsResolved);
router.get("/", getAllNonResolvedSOS);
router.post("/mySOS", getAllMySOS);
router.post("/acceptSOS", acceptSOS);

export default router;
