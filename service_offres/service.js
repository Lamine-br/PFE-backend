const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.get("/employeur/offres/:id", verifyAccessToken, async (req, res) => {
	const offreId = req.params.id;
	try {
		const userId = req.decoded.userPayload._id;
		const offre = await Offre.findOne({ _id: offreId, employeur: userId });

		if (!offre) {
			return res.status(404).json({ message: "Offre non trouvée" });
		}
		return res.status(200).json(offre);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/employeur/offres", verifyAccessToken, async (req, res) => {
	try {
		console.log(req.decoded.userPayload._id);
		const userId = req.decoded.userPayload._id;
		const offres = await Offre.find({ employeur: userId });
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/employeur/offres/add", verifyAccessToken, async (req, res) => {
	const { titre, metier, description, debut, fin, remuneration } = req.body;
	const employeur = req.decoded.userPayload._id;

	try {
		const fulldate = new Date();

		const annee = fulldate.getFullYear();
		const mois = (fulldate.getMonth() + 1).toString().padStart(2, "0");
		const jour = fulldate.getDate().toString().padStart(2, "0");

		const date = `${annee}-${mois}-${jour}`;

		const offre = new Offre({
			titre,
			metier,
			description,
			debut,
			fin,
			remuneration,
			date,
			employeur,
		});

		const offreErgst = await offre.save();

		console.log("Offre ajoutée");
		return res.status(201).json(offreErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/employeur/offres/:id", verifyAccessToken, async (req, res) => {
	const { titre, metier, description, debut, fin, remuneration } = req.body;
	const employeur = req.decoded.userPayload._id;
	const id_offre = req.params.id;

	try {
		const offre = await Offre.findById(id_offre);

		if (!offre) {
			return res.status(404).json({ message: "Offre non trouvée" });
		}

		if (offre.employeur.toString() !== employeur) {
			return res.status(403).json({
				message: "Accès interdit ! Vous ne pouvez pas modifier cette offre.",
			});
		}

		offre.titre = titre || offre.titre;
		offre.metier = metier || offre.metier;
		offre.description = description || offre.description;
		offre.debut = debut || offre.debut;
		offre.fin = fin || offre.fin;
		offre.remuneration = remuneration || offre.remuneration;

		const nouvelleOffre = await offre.save();

		console.log("Offre mise à jour");
		return res.status(200).json(nouvelleOffre);
	} catch (error) {
		console.error("Error updating offer:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.delete("/employeur/offres/:id", verifyAccessToken, async (req, res) => {
	const offreId = req.params.id;

	try {
		const result = await Offre.deleteOne({ _id: offreId });

		if (result.deletedCount === 0) {
			return res.status(404).json({ message: "Offer not found" });
		}
		console.log("Offre supprimée");
		return res.status(200).json({ message: "Offre supprimée avec succès" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
