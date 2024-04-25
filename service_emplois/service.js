const express = require("express");
const cors = require("cors");
const Offre = require("../models/offre");
const Candidature = require("../models/candidature");
const Notification = require("../models/notification");
const Dossier = require("../models/dossier");
const Chercheur = require("../models/chercheur");
const Employeur = require("../models/employeur");
const Contact = require("../models/contact");
const Reponse = require("../models/reponse");
const Alerte = require("../models/alerte");
const Emploi = require("../models/emploi");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");
const moment = require("moment");
const { upload } = require("./utils/uploadFile");

const service = express();
const PORT = 3005;

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
registerService("emplois", "v1", PORT);

service.post(
	"/emplois/upload/:folderName",
	upload.single("attestation"),
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

service.put(
	"/emplois/chercheur/addToAgenda",
	verifyAccessToken,
	async (req, res) => {
		try {
			const id = req.body.id;
			console.log(id);
			console.log("done");

			const emploi = await Emploi.findById(id);
			console.log(emploi);

			if (!emploi) {
				return res.status(404).json({ message: "Emploi introuvable" });
			}

			emploi.agenda = true;
			await emploi.save();

			return res.status(200).json(emploi);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Erreur interne du serveur" });
		}
	}
);

service.get("/emplois/chercheur", verifyAccessToken, async (req, res) => {
	const chercheur = req.decoded.payloadAvecRole._id;
	try {
		const emplois = await Emploi.find({ chercheur: chercheur }).populate(
			"offre"
		);

		return res.status(200).json(emplois);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/emplois/employeur", verifyAccessToken, async (req, res) => {
	const employeur = req.decoded.payloadAvecRole._id;
	try {
		const emplois = await Emploi.find({ "offre.employeur": employeur })
			.populate("offre")
			.populate("chercheur")
			.exec();

		return res.status(200).json(emplois);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/emplois/chercheur/:id", verifyAccessToken, async (req, res) => {
	const chercheur = req.decoded.payloadAvecRole._id;
	try {
		const id = req.params.id;
		const emploi = await Emploi.findById(id)
			.populate({
				path: "offre",
				populate: {
					path: "employeur",
					populate: {
						path: "contacts",
					},
				},
			})
			.populate("chercheur")
			.exec();

		return res.status(200).json(emploi);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/emplois/:id/alertes", verifyAccessToken, async (req, res) => {
	const chercheur = req.decoded.payloadAvecRole._id;
	try {
		const id = req.params.id;
		const alertes = await Alerte.find({ chercheur: chercheur, emploi: id });

		return res.status(200).json(alertes);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post(
	"/emplois/chercheur/alertes/add",
	verifyAccessToken,
	async (req, res) => {
		const { emploi, date, titre, description } = req.body;
		const chercheur = req.decoded.payloadAvecRole._id;

		try {
			const alerte = new Alerte({
				date,
				titre,
				description,
				chercheur,
				emploi,
			});

			const savedAlerte = await alerte.save();

			const savedChercheur = await Chercheur.findById(chercheur);
			savedChercheur.alertes.push(savedAlerte._id);
			await savedChercheur.save();

			console.log("Alerte ajoutée");
			return res.status(201).json(savedAlerte);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.delete(
	"/emplois/chercheur/alertes/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const chercheur = req.decoded.payloadAvecRole._id;

		try {
			const result = await Alerte.deleteOne({ _id: id, chercheur: chercheur });

			if (result.deletedCount === 0) {
				return res.status(404).json({ message: "Alerte non trouvé" });
			}

			const updatedChercheur = await Chercheur.findByIdAndUpdate(
				chercheur,
				{ $pull: { alertes: id } }, // Utilisation de $pull pour retirer l'alerte de la liste
				{ new: true } // Pour renvoyer le document mis à jour
			);

			if (!updatedChercheur) {
				return res.status(404).json({ message: "Chercheur introuvable" });
			}

			console.log("Alerte supprimée");
			return res.status(200).json({ message: "Alerte supprimée avec succès" });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/emplois/chercheur/demanderAttestation",
	verifyAccessToken,
	async (req, res) => {
		const id = req.body.id;
		const chercheur = req.decoded.payloadAvecRole._id;

		try {
			const emploi = await Emploi.findById(id).populate("offre");
			if (!emploi) {
				return res.status(404).json({ message: "Emploi non trouvé" });
			}

			// Vérifiez si le chercheur a le droit de demander une attestation pour cet emploi
			if (chercheur.toString() !== emploi.chercheur.toString()) {
				return res.status(403).json({
					message: "Vous n'êtes pas autorisé à effectuer cette action",
				});
			}

			emploi.attestation = "demandée";
			await emploi.save();

			// Notifier l'employeur de la demande
			let notification = new Notification({
				type: "Demande d'attestation",
				contenu: "Un chercheur demande une attestation de travail",
				lien: "/employeur/emplois/" + id,
				date_creation: moment().format("YYYY-MM-DD"),
				date_lecture: "",
				statut: "non lu",
				type_recepteur: "employeur",
				recepteur: emploi.offre.employeur,
			});
			await notification.save();

			console.log("Attestation demandée pour l'emploi :", id);
			return res
				.status(200)
				.json({ message: "Attestation demandée avec succès" });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Erreur interne du serveur" });
		}
	}
);

service.post(
	"/emplois/employeur/uploadAttestation",
	verifyAccessToken,
	async (req, res) => {
		const { id, attestation } = req.body;
		const employeur = req.decoded.payloadAvecRole._id;

		try {
			const emploi = await Emploi.findById(id).populate("offre");
			if (!emploi) {
				return res.status(404).json({ message: "Emploi non trouvé" });
			}

			// Vérifiez si le chercheur a le droit de demander une attestation pour cet emploi
			if (employeur.toString() !== emploi.offre.employeur.toString()) {
				return res.status(403).json({
					message: "Vous n'êtes pas autorisé à effectuer cette action",
				});
			}

			emploi.attestation = attestation;
			await emploi.save();

			// Notifier l'employeur de la demande
			let notification = new Notification({
				type: "Attestation Emploi",
				contenu: "Un employeur a actualisé une attestation de travail",
				lien: "/chercheur/emplois/" + id,
				date_creation: moment().format("YYYY-MM-DD"),
				date_lecture: "",
				statut: "non lu",
				type_recepteur: "chercheur",
				recepteur: emploi.chercheur,
			});
			await notification.save();

			console.log("Attestation mise à jour pour l'emploi :", id);
			return res
				.status(200)
				.json({ message: "Attestation mise à jour avec succès" });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Erreur interne du serveur" });
		}
	}
);

service.listen(PORT, () => console.log("Service is running at port " + PORT));
