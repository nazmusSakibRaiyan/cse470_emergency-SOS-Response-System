import express from "express";
import {
	sendSoftSOS,
	sendSilentSOS,
	setAsResolved,
	getAllNonResolvedSOS,
	getAllMySOS,
	acceptSOS,
	generateSafetyReport,
	getSOSById,
	monitorActiveSOSCases,
	getSOSStatistics,
	getSOSDetails,
} from "../controllers/sosController.js";
import {
	adminMiddleware,
	authMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/sendSoftSOS", sendSoftSOS);
router.post("/sendSilentSOS", sendSilentSOS);
router.post("/setAsResolved", setAsResolved);
router.get("/", getAllNonResolvedSOS);
router.get("/active", authMiddleware, getAllNonResolvedSOS); // Removed adminMiddleware to allow volunteers to see active SOS
router.get("/stats", authMiddleware, getSOSStatistics); // New route for dashboard statistics
router.post("/mySOS", getAllMySOS);
router.post("/acceptSOS", acceptSOS);

// Update the route to support both GET and POST
router.get("/report", authMiddleware, adminMiddleware, generateSafetyReport);
router.post(
	"/safety-report",
	authMiddleware,
	adminMiddleware,
	generateSafetyReport
);

router.get(
	"/monitor-active",
	authMiddleware,
	adminMiddleware,
	monitorActiveSOSCases
);
router.get("/:sosId", authMiddleware, getSOSById);
router.get("/:id", authMiddleware, getSOSDetails); // New route to fetch SOS details by ID

export default router;
