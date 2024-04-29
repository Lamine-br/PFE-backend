const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const CandidatureSpontanee = require("../models/candidatureSpontanee");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const Employeur = require("../models/employeur");
const Metier = require("../models/metier");
const Reponse = require("../models/reponse");
const Emploi = require("../models/emploi");
const Notification = require("../models/notification");
const Etiquette = require("../models/etiquette");
const Probleme = require("../models/probleme");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const moment = require("moment");
const axios = require("axios");
const { upload } = require("./utils/uploadFile");

const service = express();
const PORT = 3004;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true, limit: "50mb" }));
service.use(express.json({ limit: "50mb" }));

service.use(express.static("public"));

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
registerService("candidatures", "v1", PORT);

service.post(
	"/candidatures/upload/:folderName",
	upload.single("cv"),
	(req, res) => {
		if (!req.file) {
			return res.status(400).json("No file uploaded.");
		}

		const filePath = req.file.path.replace(/\\/g, "/");
		const fileUrl = filePath.substring(
			filePath.indexOf("/public") + "/public".length
		);

		return res.status(200).json(fileUrl);
	}
);

service.get("/candidatures/employeur", verifyAccessToken, async (req, res) => {
	try {
		console.log(req.decoded.payloadAvecRole._id);
		const userId = req.decoded.payloadAvecRole._id;
		const candidatures = await Candidature.find({ "offre.employeur": userId })
			.populate("offre")
			.populate("chercheur")
			.exec();
		return res.status(200).json(candidatures);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/candidatures/chercheur", verifyAccessToken, async (req, res) => {
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
	"/candidatures/chercheur/spontanees",
	verifyAccessToken,
	async (req, res) => {
		try {
			console.log(req.decoded);
			const userId = req.decoded.payloadAvecRole._id;
			const candidatures = await CandidatureSpontanee.find({
				chercheur: userId,
			}).populate("employeurs metiers");
			return res.status(200).json(candidatures);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/candidatures/chercheur/spontanees/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const userId = req.decoded.payloadAvecRole._id;
		try {
			const candidature = await CandidatureSpontanee.findById(id);
			if (userId !== candidature.chercheur.toString()) {
				return res.status(403).json("Unauthorized access");
			}

			await Candidature.populate(candidature, {
				path: "employeurs metiers chercheur",
			});
			return res.status(200).json(candidature);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/candidatures/chercheur/:id",
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
	"/candidatures/employeur/etiquettes",
	verifyAccessToken,
	async (req, res) => {
		const userId = req.decoded.payloadAvecRole._id;
		try {
			const etiquettes = await Etiquette.find({ employeur: userId });
			return res.status(200).json(etiquettes);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/candidatures/employeur/:id",
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
				.populate("dossier chercheur etiquettes")
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
	"/candidatures/chercheur/add",
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
	"/candidatures/chercheur/:id",
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
	"/candidatures/chercheur/:id",
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
	"/candidatures/chercheur/:id/contact",
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
	"/candidatures/employeur/:id/contact",
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
	"/candidatures/chercheur/:id/reponses",
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
	"/candidatures/employeur/:id/reponses",
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
	"/candidatures/employeur/validate",
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
	"/candidatures/employeur/refuse",
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
	"/candidatures/chercheur/validate",
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
			const agenda = false;
			const chercheur = updatedCandidature.chercheur;
			const offre = updatedCandidature.offre;

			const emploi = new Emploi({ agenda, chercheur, offre });
			emploi.save();

			console.log("Candidature validée");
			return res.status(200).json(updatedCandidature);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/candidatures/chercheur/refuse",
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
	"/candidatures/chercheur/delete",
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

service.post(
	"/candidatures/chercheur/declareProblem",
	verifyAccessToken,
	async (req, res) => {
		const { candidature, titre, contenu } = req.body;
		const chercheur = req.decoded.payloadAvecRole._id;
		try {
			const probleme = new Probleme({
				titre,
				contenu,
				candidature,
				chercheur,
			});
			const problemeEngst = await probleme.save();

			console.log("Problème enregistrée");
			return res.status(200).json(problemeEngst);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/candidatures/chercheur/spontanees/add",
	verifyAccessToken,
	async (req, res) => {
		const { employeurs, metiers, date_debut, date_fin } = req.body;
		const chercheur = req.decoded.payloadAvecRole._id;

		try {
			const chercheurExistant = await Chercheur.findById(chercheur);
			if (!chercheurExistant) {
				return res.status(404).json({ message: "Chercheur introuvable" });
			}

			let cv = chercheurExistant.cv;
			let motivation = "";
			let commentaire = "";
			let dossier = new Dossier({
				cv,
				motivation,
				commentaire,
			});

			const savedDossier = await dossier.save();
			dossier = savedDossier._id;

			const candidature = new CandidatureSpontanee({
				dossier,
				date_debut,
				date_fin,
				chercheur,
				employeurs,
				metiers,
			});

			const savedCandidature = await candidature.save();

			chercheurExistant.candidatures_spontanees.push(savedCandidature._id);
			await chercheurExistant.save();

			console.log("Candidature spontanée ajoutée");
			return res.status(201).json(savedCandidature);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/candidatures/chercheur/:id",
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

service.post(
	"/candidatures/employeur/etiquettes/add",
	verifyAccessToken,
	async (req, res) => {
		const { nom } = req.body;
		const employeur = req.decoded.payloadAvecRole._id;

		try {
			const etiquette = new Etiquette({
				nom,
				employeur,
			});

			const saveEtiquette = await etiquette.save();

			console.log("Etiquette ajoutée");
			return res.status(201).json(saveEtiquette);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.put(
	"/candidatures/employeur/etiquettes/:id",
	verifyAccessToken,
	async (req, res) => {
		const { nom } = req.body;
		const { id } = req.params;
		const employeur = req.decoded.payloadAvecRole._id;

		try {
			const etiquette = await Etiquette.findById(id);
			if (!etiquette) {
				return res.status(404).json("Etiquette introuvable");
			}
			if (etiquette.employeur.toString() !== employeur) {
				return res.status(401).json("Unauthorized");
			}
			etiquette.nom = nom;
			const saveEtiquette = await etiquette.save();

			console.log("Etiquette modifiée");
			return res.status(201).json(saveEtiquette);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/candidatures/employeur/etiquettes/addToCandidature",
	verifyAccessToken,
	async (req, res) => {
		const { nom, id } = req.body;
		const employeur = req.decoded.payloadAvecRole._id;

		try {
			// Vérifier si l'étiquette existe déjà pour cet employeur et avec ce nom
			let etiquette = await Etiquette.findOne({
				nom: nom,
				employeur: employeur,
			});

			if (!etiquette) {
				// Si l'étiquette n'existe pas, la créer
				etiquette = new Etiquette({ nom: nom, employeur: employeur });
				await etiquette.save();
			}

			// Ajouter l'ID de l'étiquette à la candidature
			const candidature = await Candidature.findById(id);
			if (!candidature) {
				return res.status(404).json({ message: "Candidature introuvable" });
			}

			// Vérifier si l'étiquette est déjà associée à la candidature
			if (candidature.etiquettes.includes(etiquette._id)) {
				return res.status(400).json({
					message: "Cette étiquette est déjà associée à la candidature",
				});
			}

			// Ajouter l'ID de l'étiquette à la liste des étiquettes de la candidature
			candidature.etiquettes.push(etiquette._id);
			const savedCandidature = await candidature.save();

			return res.status(200).json(savedCandidature);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Erreur interne du serveur" });
		}
	}
);

service.get("/candidatures/statistics", async (req, res) => {
	try {
		let { lieu, metier } = req.query;
		let matchQuery = {};

		if (metier) {
			matchQuery["metier.nom"] = metier;
		} else {
			matchQuery["metier.nom"] = { $exists: true };
		}

		if (lieu) {
			matchQuery["offre.lieu"] = lieu;
		} else {
			matchQuery["offre.lieu"] = { $exists: true }; // Filtre les offres où le lieu est défini
		}

		// Agrégation par semaine
		const statisticsSemaine = await Candidature.aggregate([
			{
				$lookup: {
					from: "offres",
					localField: "offre",
					foreignField: "_id",
					as: "offre",
				},
			},
			{
				$lookup: {
					from: "metiers",
					localField: "offre.metier",
					foreignField: "_id",
					as: "metier",
				},
			},
			{
				$match: matchQuery,
			},
			{
				$project: {
					semaine: { $isoWeek: "$createdAt" },
					annee: { $isoWeekYear: "$createdAt" },
				},
			},
			{
				$group: {
					_id: {
						semaine: "$semaine",
						annee: "$annee",
					},
					total: { $sum: 1 },
				},
			},
		]);

		// Agrégation par mois
		const statisticsMois = await Candidature.aggregate([
			{
				$lookup: {
					from: "offres",
					localField: "offre",
					foreignField: "_id",
					as: "offre",
				},
			},
			{
				$lookup: {
					from: "metiers",
					localField: "offre.metier",
					foreignField: "_id",
					as: "metier",
				},
			},
			{
				$match: matchQuery,
			},
			{
				$project: {
					mois: { $month: "$createdAt" },
					annee: { $year: "$createdAt" },
				},
			},
			{
				$group: {
					_id: {
						mois: "$mois",
						annee: "$annee",
					},
					total: { $sum: 1 },
				},
			},
		]);

		res.status(200).json({
			statisticsSemaine,
			statisticsMois,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/candidatures/statisticsMetiers", async (req, res) => {
	try {
		let { lieu, mois, annee } = req.query;
		let matchQuery = {};

		if (lieu) {
			matchQuery["offre.lieu"] = lieu;
		} else {
			matchQuery["offre.lieu"] = { $exists: true }; // Filtre les offres où le lieu est défini
		}

		// Filtrer par mois et année si les valeurs sont fournies
		if (mois && annee) {
			const startDate = moment(`${annee}-${mois}-01`, "YYYY-MM-DD");
			const endDate = startDate.clone().endOf("month");
			matchQuery.createdAt = {
				$gte: startDate.toDate(),
				$lt: endDate.toDate(),
			};
		} else if (mois) {
			const startDate = moment(`${moment().year()}-${mois}-01`, "YYYY-MM-DD");
			const endDate = startDate.clone().endOf("month");
			matchQuery.createdAt = {
				$gte: startDate.toDate(),
				$lt: endDate.toDate(),
			};
		} else if (annee) {
			const startDate = moment(`${annee}-01-01`, "YYYY-MM-DD");
			const endDate = startDate.clone().endOf("year");
			matchQuery.createdAt = {
				$gte: startDate.toDate(),
				$lt: endDate.toDate(),
			};
		}

		// Agrégation
		const statistics = await Candidature.aggregate([
			{
				$lookup: {
					from: "offres",
					localField: "offre",
					foreignField: "_id",
					as: "offre",
				},
			},
			{
				$lookup: {
					from: "metiers",
					localField: "offre.metier",
					foreignField: "_id",
					as: "metier",
				},
			},
			{
				$match: matchQuery,
			},
			{
				$project: {
					metier: "$metier.nom",
				},
			},
			{
				$group: {
					_id: "$metier",
					total: { $sum: 1 },
				},
			},
			{
				$sort: { total: -1 }, // Trier par ordre décroissant de la somme
			},
		]);

		res.status(200).json({
			statistics,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
