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

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.get("/chercheur/emplois", async (req, res) => {
	try {
		const emplois = await Emploi.find().populate("offre");

		return res.status(200).json(emplois);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/chercheur/emplois/:id", async (req, res) => {
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
