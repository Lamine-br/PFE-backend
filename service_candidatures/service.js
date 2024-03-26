const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.get("/employeur/candidatures", verifyAccessToken, async (req, res) => {
	try {
		console.log(req.decoded.userPayload._id);
		const userId = req.decoded.userPayload._id;
		const candidatures = await Candidature.find()
			.populate({
				path: "offre",
				match: { employeur: userId },
			})
			.populate("chercheur")
			.exec();
		return res.status(200).json(candidatures);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get(
	"/employeur/candidatures/:id",
	verifyAccessToken,
	async (req, res) => {
		const candidatureId = req.params.id;
		try {
			const userId = req.decoded.userPayload._id;
			const candidature = await Candidature.find().populate("offre").findOne({
				_id: candidatureId,
				"offre.employeur": userId,
			});

			if (!candidature) {
				return res.status(404).json({ message: "Offre non trouvée" });
			}
			return res.status(200).json(offre);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post("/chercheur/candidatures/add", async (req, res) => {
	const { cv, motivation, commentaire, chercheur, offre } = req.body;

	try {
		const fulldate = new Date();

		const annee = fulldate.getFullYear();
		const mois = (fulldate.getMonth() + 1).toString().padStart(2, "0");
		const jour = fulldate.getDate().toString().padStart(2, "0");

		const date = `${annee}-${mois}-${jour}`;
		const status = "En attente";

		let dossier = new Dossier({
			cv,
			motivation,
			commentaire,
		});

		const savedDossier = await dossier.save();
		dossier = savedDossier._id;

		const candidature = new Candidature({
			dossier,
			date,
			status,
			chercheur,
			offre,
		});

		const savedCandidature = await candidature.save();

		const chercheurExistant = await Chercheur.findById(chercheur);
		if (!chercheurExistant) {
			return res.status(404).json({ message: "Chercheur introuvable" });
		}

		chercheurExistant.candidatures.push(savedCandidature._id);
		await chercheurExistant.save();

		console.log("Candidature ajoutée");
		return res.status(201).json(savedCandidature);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
