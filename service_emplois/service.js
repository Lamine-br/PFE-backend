const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const Reponse = require("../models/reponse");
const Emploi = require("../models/emploi");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");

const service = express();
const PORT = 3005;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

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
registerService("emplois", "v1", PORT);

service.get("/emplois/chercheur", async (req, res) => {
	try {
		const emplois = await Emploi.find().populate("offre");

		return res.status(200).json(emplois);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/emplois/chercheur/:id", async (req, res) => {
	try {
		const id = req.params.id;
		const emploi = await Emploi.findById(id).populate("offre");

		return res.status(200).json(emploi);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
