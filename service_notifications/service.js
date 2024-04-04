const express = require("express");
const cors = require("cors");
const Notification = require("../models/notification");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const moment = require("moment");
const cron = require("node-cron");

connectDB();

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

service.post("/notifications/add", async (req, res) => {
	const { type, contenu, lien, type_recepteur, recepteur } = req.body;

	try {
		const date_creation = moment().format("YYYY-MM-DD | HH-mm-ss");
		const date_lecture = "";
		const statut = "non lu";
		// Création de la notification
		const notification = new Notification({
			type,
			contenu,
			date_creation,
			date_lecture,
			statut,
			lien,
			type_recepteur,
			recepteur,
		});

		const notificationErgst = await notification.save();

		return res.status(201).json(notificationErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/notifications", verifyAccessToken, async (req, res) => {
	console.log(req.decoded);
	const type = req.decoded.payloadAvecRole.type;
	const userId = req.decoded.payloadAvecRole._id;
	try {
		const notifications = await Notification.find({
			type_recepteur: type,
			recepteur: userId,
		});

		return res.status(200).json(notifications);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/notifications/:id", verifyAccessToken, async (req, res) => {
	const idNotification = req.params.id;
	const type = req.decoded.payloadAvecRole.type;
	const userId = req.decoded.payloadAvecRole._id;
	try {
		const updatedNotification = await Notification.updateOne(
			{ _id: idNotification },
			{ statut: "lu" }
		);

		if (updatedNotification.modifiedCount === 0) {
			return res.status(400).json("Notification non trouvée");
		}

		return res.status(200).json(updatedNotification);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
