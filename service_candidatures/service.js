const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const Reponse = require("../models/reponse");
const Emploi = require("../models/emploi");
const Notification = require("../models/notification");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const moment = require("moment");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.get("/employeur/candidatures", verifyAccessToken, async (req, res) => {
	try {
		console.log(req.decoded.payloadAvecRole._id);
		const userId = req.decoded.payloadAvecRole._id;
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

service.get("/chercheur/candidatures", verifyAccessToken, async (req, res) => {
	try {
		console.log(req.decoded);
		const userId = req.decoded.payloadAvecRole._id;
		const candidatures = await Candidature.find({ chercheur: userId }).populate(
			"offre dossier"
		);
		return res.status(200).json(candidatures);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get(
	"/chercheur/candidatures/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const userId = req.decoded.payloadAvecRole._id;
		try {
			const candidature = await Candidature.findById(id);
			if (userId !== candidature.chercheur.toString()) {
				return res.status(403).json("Unauthorized access");
			}

			await Candidature.populate(candidature, {
				path: "offre chercheur dossier",
			});
			return res.status(200).json(candidature);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/employeur/candidatures/:id",
	verifyAccessToken,
	async (req, res) => {
		const candidatureId = req.params.id;
		try {
			const userId = req.decoded.payloadAvecRole._id;
			const candidature = await Candidature.findOne({ _id: candidatureId })
				.populate({
					path: "offre",
					match: { employeur: userId },
				})
				.populate("dossier chercheur")
				.exec();

			if (!candidature) {
				return res.status(404).json({ message: "Offre non trouvée" });
			}
			return res.status(200).json(candidature);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/chercheur/candidatures/add",
	verifyAccessToken,
	async (req, res) => {
		const { cv, motivation, commentaire, offre } = req.body;
		const chercheur = req.decoded.payloadAvecRole._id;

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
	}
);

service.put(
	"/chercheur/candidatures/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const { cv, motivation, commentaire } = req.body;
		const userId = req.decoded.payloadAvecRole._id;

		try {
			const existingCandidature = await Candidature.findById(id);

			if (!existingCandidature) {
				return res.status(404).json({ message: "Candidature introuvable" });
			}

			if (userId !== existingCandidature.chercheur.toString()) {
				return res.status(403).json("Unauthorized access");
			}

			if (!cv && !motivation && !commentaire) {
				return res
					.status(400)
					.json({ message: "Aucune donnée de mise à jour fournie" });
			}

			const dossier = await Dossier.findById(existingCandidature.dossier);

			if (!dossier) {
				return res.status(404).json({ message: "Dossier introuvable" });
			}

			if (cv) dossier.cv = cv;
			if (motivation) dossier.motivation = motivation;
			if (commentaire) dossier.commentaire = commentaire;

			const updatedDossier = await dossier.save();
			console.log("Candidature mise à jour");

			const candidaturePeuplee = await Candidature.findById(id).populate(
				"dossier"
			);

			return res.status(200).json(candidaturePeuplee);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.delete(
	"/chercheur/candidatures/:id",
	verifyAccessToken,
	async (req, res) => {
		const { id } = req.params;
		const userId = req.decoded.payloadAvecRole._id;

		try {
			const candidature = await Candidature.findById(id);

			if (!candidature) {
				return res.status(404).json({ message: "Candidature introuvable" });
			}

			if (userId !== candidature.chercheur.toString()) {
				return res.status(403).json("Unauthorized access");
			}

			const deletedCandidature = await Candidature.findByIdAndDelete(id);

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
	}
);

service.post(
	"/chercheur/candidatures/:id/contact",
	verifyAccessToken,
	async (req, res) => {
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
			return res.status(200).json(reponseEngst);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/employeur/candidatures/:id/contact",
	verifyAccessToken,
	async (req, res) => {
		const candidature = req.params.id;
		const { titre, contenu } = req.body;
		try {
			const type_emetteur = "employeur";
			const type_destinataire = "chercheur";
			const reponse = new Reponse({
				type_emetteur,
				type_destinataire,
				candidature,
				titre,
				contenu,
			});
			const reponseEngst = await reponse.save();

			// Notifier le chercheur du message
			const candidatureErgt = await Candidature.findById(candidature);
			let notification = new Notification({
				type: "Message",
				contenu: "Un employeur vous a contacté",
				lien: "/chercheur/candidatures/" + candidature,
				date_creation: moment().format("YYYY-MM-DD"),
				date_lecture: "",
				statut: "non lu",
				type_recepteur: "chercheur",
				recepteur: candidatureErgt.chercheur,
			});
			await notification.save();

			return res.status(200).json(reponseEngst);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/chercheur/candidatures/:id/reponses",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		try {
			const reponses = await Reponse.find({ candidature: id });
			return res.status(200).json(reponses);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/employeur/candidatures/:id/reponses",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		try {
			const reponses = await Reponse.find({ candidature: id });
			return res.status(200).json(reponses);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/employeur/candidatures/validate",
	verifyAccessToken,
	async (req, res) => {
		const id_candidature = req.body.id;
		try {
			const date = moment().format("YYYY-MM-DD");
			await Candidature.updateOne(
				{ _id: id_candidature },
				{ status: "Validé", date_traitement: date }
			);

			const candidature = await Candidature.findById(id_candidature);

			// Notifier le chercheur de la validation de sa candidature
			let notification = new Notification({
				type: "Candidature acceptée",
				contenu: "Votre candidature est acceptée",
				lien: "/chercheur/candidatures/" + id_candidature,
				date_creation: moment().format("YYYY-MM-DD"),
				date_lecture: "",
				statut: "non lu",
				type_recepteur: "chercheur",
				recepteur: candidature.chercheur,
			});
			await notification.save();

			console.log("Candidature validée");
			return res.status(200).json("Candidature validée");
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/employeur/candidatures/refuse",
	verifyAccessToken,
	async (req, res) => {
		const id_candidature = req.body.id;
		try {
			const date = moment().format("YYYY-MM-DD");
			await Candidature.updateOne(
				{ _id: id_candidature },
				{ status: "Refusé", date_traitement: date }
			);

			const candidature = await Candidature.findById(id_candidature);

			// Notifier le chercheur du refus de sa candidature
			let notification = new Notification({
				type: "Candidature refusée",
				contenu: "Votre candidature est refusée",
				lien: "/chercheur/candidatures/" + id_candidature,
				date_creation: moment().format("YYYY-MM-DD"),
				date_lecture: "",
				statut: "non lu",
				type_recepteur: "chercheur",
				recepteur: candidature.chercheur,
			});
			await notification.save();

			console.log("Candidature refusée");
			return res.status(200).json("Candidature refusée");
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/chercheur/candidatures/validate",
	verifyAccessToken,
	async (req, res) => {
		const id_candidature = req.body.id;
		try {
			await Candidature.updateOne(
				{ _id: id_candidature },
				{ status: "Validé Validé" }
			);

			const updatedCandidature = await Candidature.findById(id_candidature);

			// Création de l'emploi pour le chercheur
			const chercheur = updatedCandidature.chercheur;
			const offre = updatedCandidature.offre;

			const emploi = new Emploi({ chercheur, offre });
			emploi.save();

			console.log("Candidature validée");
			return res.status(200).json(updatedCandidature);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/chercheur/candidatures/refuse",
	verifyAccessToken,
	async (req, res) => {
		const id_candidature = req.body.id;
		try {
			await Candidature.updateOne(
				{ _id: id_candidature },
				{ status: "Validé Refusé" }
			);

			console.log("Candidature refusée");
			return res.status(200).json("Candidature refusée");
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/chercheur/candidatures/delete",
	verifyAccessToken,
	async (req, res) => {
		const id_candidature = req.body.id;
		try {
			await Candidature.updateOne(
				{ _id: id_candidature },
				{ status: "Supprimé" }
			);

			const updatedCandidature = await Candidature.findById(id_candidature);

			console.log("Candidature supprimée");
			return res.status(200).json(updatedCandidature);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.listen(PORT, () => console.log("Service is running at port " + PORT));
