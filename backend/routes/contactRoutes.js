import express from "express";
import {
	addNewContact,
	deleteContact,
	getAllContacts,
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/addContact", addNewContact);
router.post("/getAllContacts", getAllContacts);
router.delete("/deleteContact", deleteContact);

export default router;
