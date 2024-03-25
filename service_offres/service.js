const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Metier = require("../models/metier");
const Employeur = require("../models/employeur");
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
		const offre = await Offre.findOne({
			_id: offreId,
			employeur: userId,
		}).populate("metier");

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
		const offres = await Offre.find({ employeur: userId }).populate("metier");
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres", async (req, res) => {
	try {
		const offres = await Offre.find().populate("metier employeur");
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres/:id", async (req, res) => {
	const offreId = req.params.id;
	try {
		const offre = await Offre.findOne({
			_id: offreId,
		}).populate("metier employeur");

		if (!offre) {
			return res.status(404).json({ message: "Offre non trouvée" });
		}
		return res.status(200).json(offre);
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

		console.log(offre);

		const offreErgst = await offre.save();

		const metierExistant = await Metier.findById(metier);
		if (!metierExistant) {
			return res.status(404).json({ message: "Métier introuvable" });
		}

		metierExistant.offres.push(offreErgst._id);
		await metierExistant.save();

		console.log("Offre ajoutée");
		return res.status(201).json(offreErgst);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Erreur interne du serveur" });
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

		const ancienMetier = offre.metier;
		const nouveauMetier = metier;

		if (ancienMetier !== nouveauMetier) {
			await Metier.updateOne(
				{ _id: ancienMetier },
				{ $pull: { offres: id_offre } }
			);
			await Metier.updateOne(
				{ _id: nouveauMetier },
				{ $push: { offres: id_offre } }
			);
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
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.delete("/employeur/offres/:id", verifyAccessToken, async (req, res) => {
	const offreId = req.params.id;

	try {
		const offreExistante = await Offre.findById(offreId);
		if (!offreExistante) {
			return res.status(404).json({ message: "Offre introuvable" });
		}

		await Offre.findByIdAndDelete(offreId);

		const metierId = offreExistante.metier;
		const metier = await Metier.findById(metierId);
		if (metier) {
			metier.offres = metier.offres.filter(
				(offre) => offre.toString() !== offreId
			);
			await metier.save();
		}

		console.log("Offre supprimée");
		return res.status(200).json({ message: "Offre supprimée avec succès" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/metiers/add", async (req, res) => {
	const { nom, description, secteur } = req.body;

	try {
		const metier = new Metier({
			nom,
			description,
			secteur,
		});

		const metierErgst = await metier.save();

		console.log("Métier ajouté");
		return res.status(201).json(metierErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/metiers", async (req, res) => {
	try {
		const metiers = await Metier.find();
		return res.status(200).json(metiers);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/metiers/:id", async (req, res) => {
	const metierId = req.params.id;
	try {
		const metier = await Metier.findOne({ _id: metierId });

		if (!metier) {
			return res.status(404).json({ message: "Metier non trouvé" });
		}
		return res.status(200).json(metier);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/metiers/:id", async (req, res) => {
	const { nom, secteur, description } = req.body;
	const id_metier = req.params.id;

	try {
		const metier = await Metier.findById(id_metier);

		if (!metier) {
			return res.status(404).json({ message: "Metier non trouvé" });
		}

		metier.nom = nom || metier.nom;
		metier.secteur = secteur || metier.secteur;
		metier.description = description || metier.description;

		const nouveeauMetier = await metier.save();

		console.log("Métier mise à jour");
		return res.status(200).json(nouveeauMetier);
	} catch (error) {
		console.error("Erreur lors de la modification :", error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.delete("/metiers/:id", async (req, res) => {
	const metierId = req.params.id;

	try {
		const result = await Metier.deleteOne({ _id: metierId });

		if (result.deletedCount === 0) {
			return res.status(404).json({ message: "Métier non trouvé" });
		}
		console.log("Métier supprimé");
		return res.status(200).json({ message: "Métier supprimé avec succès" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
