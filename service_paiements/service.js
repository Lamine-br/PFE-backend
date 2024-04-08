const express = require("express");
const cors = require("cors");
const Paiement = require("../models/paiement");
const Employeur = require("../models/employeur");
const Abonnement = require("../models/abonnement");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const moment = require("moment");
const cron = require("node-cron");
const axios = require("axios");

connectDB();

const service = express();
const PORT = 3009;

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
registerService("paiements", "v1", PORT);

service.post("/paiements/add", verifyAccessToken, async (req, res) => {
	const { abonnement, type } = req.body;
	const userId = req.decoded.payloadAvecRole._id;

	try {
		// Récupération les détails de l'abonnement
		const abo = await Abonnement.findById(abonnement);
		if (!abo) {
			return res.status(400).json({ message: "Abonnement introuvable" });
		}

		// Enregistrement du paiement
		const paiement = new Paiement({
			type,
			abonnement,
			employeur: userId,
		});
		const paiementErgst = await paiement.save();
		console.log("Paiement enregistré");

		// Ajout de l'abonnement dans le  profil de l'employeur et mise à jour des dates début et fin
		const employeur = await Employeur.findById(userId);
		employeur.abonnement.debut = moment().format("YYYY-MM-DD");
		employeur.abonnement.fin = moment()
			.add(abo.duree, "days")
			.format("YYYY-MM-DD");
		employeur.abonnement.abonnement = abonnement;
		employeur.abonnement.paiement = paiementErgst._id;

		await employeur.save();

		return res.status(201).json(paiementErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

// La fonction qui envoie des préavis avant la fin des abonnements

// cron.schedule("* * * * *", async () => {
// 	// Récupère tous les employeurs
// 	const employeurs = await Employeur.find();
// 	// Pour chaque employeur, vérifier les dates
// 	employeurs.map(async (employeur) => {
// 		if (employeur.abonnement) {
// 			console.log(
// 				moment(employeur.abonnement.fin, "YYYY-MM-DD").format("YYYY-MM-DD"),
// 				moment().format("YYYY-MM-DD")
// 			);
// 			if (
// 				moment(employeur.abonnement.fin, "YYYY-MM-DD").isSame(
// 					moment().format("YYYY-MM-DD")
// 				)
// 			) {
// 				console.log("Fin dans 1 jour");
// 			}
// 		}
// 	});
// 	console.log("Task running every minute");
// });

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
