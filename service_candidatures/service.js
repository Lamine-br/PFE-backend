const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const Reponse = require("../models/reponse");
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

service.get("/chercheur/candidatures", async (req, res) => {
	try {
		const candidatures = await Candidature.find().populate("offre dossier");
		return res.status(200).json(candidatures);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/chercheur/candidatures/:id", async (req, res) => {
	const id = req.params.id;
	console.log(id);
	try {
		const candidature = await Candidature.findById(id).populate(
			"offre chercheur dossier"
		);
		return res.status(200).json(candidature);
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
		const date_traitement = "";
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
			date_traitement,
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

		const offreExistante = await Offre.findById(offre);
		if (!offreExistante) {
			return res.status(404).json({ message: "Offre introuvable" });
		}

		offreExistante.candidatures.push(savedCandidature._id);
		await offreExistante.save();

		console.log("Candidature ajoutée");
		return res.status(201).json(savedCandidature);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/chercheur/candidatures/:id", async (req, res) => {
	const id = req.params.id;
	const { cv, motivation, commentaire } = req.body;

	try {
		const existingCandidature = await Candidature.findById(id);

		if (!existingCandidature) {
			return res.status(404).json({ message: "Candidature introuvable" });
		}

		if (!cv && !motivation && !commentaire) {
			return res
				.status(400)
				.json({ message: "Aucune donnée de mise à jour fournie" });
		}

		if (cv) existingCandidature.cv = cv;
		if (motivation) existingCandidature.motivation = motivation;
		if (commentaire) existingCandidature.commentaire = commentaire;

		const updatedCandidature = await existingCandidature.save();
		console.log("Candidature mise à jour");

		const dossier = await Dossier.findById(existingCandidature.dossier);

		if (!dossier) {
			return res.status(404).json({ message: "Dossier introuvable" });
		}

		if (cv) dossier.cv = cv;
		if (motivation) dossier.motivation = motivation;
		if (commentaire) dossier.commentaire = commentaire;

		const updatedDossier = await dossier.save();
		console.log("Dossier mis à jour");

		const candidaturePeuplee = await Candidature.findById(id).populate(
			"dossier"
		);

		return res.status(200).json(candidaturePeuplee);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.delete("/chercheur/candidatures/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const deletedCandidature = await Candidature.findByIdAndDelete(id);

		if (!deletedCandidature) {
			return res.status(404).json({ message: "Candidature introuvable" });
		}

		const relatedOffre = await Offre.findById(deletedCandidature.offre);

		if (relatedOffre) {
			relatedOffre.candidatures.pull(deletedCandidature._id);
			await relatedOffre.save();
		}

		const relatedChercheur = await Chercheur.findById(
			deletedCandidature.chercheur
		);

		if (relatedChercheur) {
			relatedChercheur.candidatures.pull(deletedCandidature._id);
			await relatedChercheur.save();
		}

		console.log("Candidature supprimée");
		return res
			.status(200)
			.json({ message: "Candidature supprimée avec succès" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/chercheur/candidatures/:id/contact", async (req, res) => {
	const candidature = req.params.id;
	const { titre, contenu } = req.body;
	try {
		const type_emetteur = "chercheur";
		const type_destinataire = "employeur";
		const reponse = new Reponse({
			type_emetteur,
			type_destinataire,
			candidature,
			titre,
			contenu,
		});
		const reponseEngst = await reponse.save();
		return res.status(201).json(reponseEngst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/chercheur/candidatures/:id/reponses", async (req, res) => {
	const id = req.params.id;
	try {
		const reponses = await Reponse.find({ candidature: id });
		return res.status(200).json(reponses);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
