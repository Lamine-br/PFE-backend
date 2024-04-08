const express = require("express");
const cors = require("cors");
const Notification = require("../models/notification");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const moment = require("moment");
const cron = require("node-cron");
const axios = require("axios");

connectDB();

const service = express();
const PORT = 3007;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

// Affichage des requetes recues
service.use((req, res, next) => {
	console.log(`Request received: ${req.method} ${req.url}`);
	next();
});

// Fonction d'enregistrement dans le service registry
const registerService = async (serviceName, serviceVersion, servicePort) => {
	try {
		const response = await axios.put(
			`http://localhost:3001/register/${serviceName}/${serviceVersion}/${servicePort}`
		);
		console.log(response.data); // Log the response from the registry service
	} catch (error) {
		console.error("Error registering service:", error);
	}
};
registerService("notifications", "v1", PORT);

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
