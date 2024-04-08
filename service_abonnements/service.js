const express = require("express");
const cors = require("cors");
const Abonnement = require("../models/abonnement");
const Contact = require("../models/contact");
const Chercheur = require("../models/chercheur");
const connectDB = require("../database/connectDB");
const bcrypt = require("bcrypt");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");

connectDB();

const service = express();
const PORT = 3008;

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
registerService("abonnements", "v1", PORT);

service.get("/abonnements", async (req, res) => {
	try {
		const abonnements = await Abonnement.find();
		return res.status(200).json(abonnements);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/abonnements/:id", async (req, res) => {
	const metierId = req.params.id;
	try {
		const abonnement = await Abonnement.findOne({ _id: metierId });

		if (!abonnement) {
			return res.status(404).json({ message: "Abonnement non trouvé" });
		}
		return res.status(200).json(abonnement);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/abonnements/add", async (req, res) => {
	const { nom, duree, prix, conditions, avantages } = req.body;

	try {
		const abonnement = new Abonnement({
			nom,
			duree,
			prix,
			conditions,
			avantages,
		});

		const abonnementErgst = await abonnement.save();

		console.log("Abonnement ajouté");
		return res.status(201).json(abonnementErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/abonnements/:id", async (req, res) => {
	const { nom, duree, prix, conditions, avantages } = req.body;
	const id_abonnement = req.params.id;

	try {
		const abonnement = await Abonnement.findById(id_abonnement);

		if (!abonnement) {
			return res.status(404).json({ message: "Abonnement non trouvé" });
		}

		abonnement.nom = nom || abonnement.nom;
		abonnement.duree = duree || abonnement.duree;
		abonnement.prix = prix || abonnement.prix;
		abonnement.conditions = conditions || abonnement.conditions;
		abonnement.avantages = avantages || abonnement.avantages;

		const nouvelAbonnement = await abonnement.save();

		console.log("Abonnement mise à jour");
		return res.status(200).json(nouvelAbonnement);
	} catch (error) {
		console.error("Erreur lors de la modification :", error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.delete("/abonnements/:id", async (req, res) => {
	const id_abonnement = req.params.id;

	try {
		const result = await Abonnement.deleteOne({ _id: id_abonnement });

		if (result.deletedCount === 0) {
			return res.status(404).json({ message: "Abonnement non trouvé" });
		}
		console.log("Abonnement supprimé");
		return res.status(200).json({ message: "Abonnement supprimé avec succès" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
