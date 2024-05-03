const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Offre = require("../models/offre");
const Metier = require("../models/metier");
const Chercheur = require("../models/chercheur");
const Employeur = require("../models/employeur");
const Categorie = require("../models/categorie");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");
const { upload } = require("./utils/uploadFile");
const moment = require("moment");

const service = express();
const PORT = 3003;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true, limit: "50mb" }));
service.use(express.json({ limit: "50mb" }));

service.use(express.static("public"));

connectDB();

service.post(
	"/offres/upload/:folderName",
	upload.single("image"),
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

service.get(
	"/offres/employeur/categories",
	verifyAccessToken,
	async (req, res) => {
		const employeur = req.decoded.payloadAvecRole._id;
		try {
			const categories = await Categorie.find({ employeur: employeur });
			return res.status(200).json(categories);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get("/offres/employeur/:id", verifyAccessToken, async (req, res) => {
	const offreId = req.params.id;
	try {
		const userId = req.decoded.payloadAvecRole._id;
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

service.get("/offres/employeur", verifyAccessToken, async (req, res) => {
	try {
		const userId = req.decoded.payloadAvecRole._id;
		const offres = await Offre.find({ employeur: userId }).populate("metier");
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres", async (req, res) => {
	try {
		let { lieu } = req.query;

		const offres = await Offre.find().populate("metier employeur");

		if (lieu) {
			// Trouver les offres ayant le même lieu que celui spécifié
			const offresMemeLieu = offres.filter((offre) => offre.lieu === lieu);

			// Trouver les offres qui n'ont pas le même lieu
			const offresAutresLieux = offres.filter((offre) => offre.lieu !== lieu);

			// Fusionner les deux tableaux
			const offresOrdonnees = [...offresMemeLieu, ...offresAutresLieux];
			return res.status(200).json(offresOrdonnees);
		}

		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres/search", async (req, res) => {
	try {
		let { search, metier, lieu } = req.query;

		const header = req.headers["authorization"];
		if (header) {
			const token = header.split(" ")[1];
			jwt.verify(token, `${process.env.JWT_SECRET}`, (err, decoded) => {
				if (err) {
					return res
						.status(403)
						.json({ message: "Failed to authenticate token" });
				}
				req.decoded = decoded;
			});
			const id = req.decoded.payloadAvecRole._id;
			const chercheur = await Chercheur.findById(id);
			if (chercheur && search) {
				chercheur.recherches.push(search);
				await chercheur.save();
			}
		}

		let offres = await Offre.find().populate("metier employeur");
		offres = offres.filter((offre) => {
			return (
				(metier
					? offre.metier.nom.toLocaleLowerCase() === metier.toLocaleLowerCase()
					: true) &&
				(lieu ? offre.lieu === lieu : true) &&
				(search
					? offre.titre.includes(search) || offre.description.includes(search)
					: true)
			);
		});
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres/advancedSearch", async (req, res) => {
	try {
		let {
			date_debut,
			date_fin,
			salaire_min,
			salaire_max,
			entreprise,
			lieu,
			metier,
		} = req.query;

		let offres = await Offre.find().populate("metier employeur");
		offres = offres.filter((offre) => {
			return (
				(date_debut ? moment(offre.debut).isSame(date_debut, "day") : true) &&
				(date_fin ? moment(offre.fin).isSame(date_fin, "day") : true) &&
				(salaire_min ? offre.salaire >= salaire_min : true) &&
				(salaire_max ? offre.salaire >= salaire_max : true) &&
				(entreprise ? offre.entreprise === entreprise : true) &&
				(lieu ? offre.lieu === lieu : true) &&
				(metier ? offre.metier === metier : true)
			);
		});
		return res.status(200).json(offres);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres/metiers", async (req, res) => {
	try {
		let metiers = await Metier.find();
		return res.status(200).json(metiers);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/offres/statistics", async (req, res) => {
	try {
		let { lieu, metier } = req.query;
		let matchQuery = {};

		if (metier) {
			matchQuery["metier.nom"] = metier;
		} else {
			matchQuery["metier.nom"] = { $exists: true };
		}

		if (lieu) {
			matchQuery.lieu = lieu;
		} else {
			matchQuery.lieu = { $exists: true }; // Filtre les offres où le lieu est défini
		}

		// Agrégation par semaine
		const statisticsSemaine = await Offre.aggregate([
			{
				$lookup: {
					from: "metiers",
					localField: "metier",
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
		const statisticsMois = await Offre.aggregate([
			{
				$lookup: {
					from: "metiers",
					localField: "metier",
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

service.get("/offres/statisticsMetiers", async (req, res) => {
	try {
		let { lieu, mois, annee } = req.query;
		let matchQuery = {};

		if (lieu) {
			matchQuery.lieu = lieu;
		} else {
			matchQuery.lieu = { $exists: true }; // Filtre les offres où le lieu est défini
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
		const statistics = await Offre.aggregate([
			{
				$lookup: {
					from: "metiers",
					localField: "metier",
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

service.post("/offres/employeur/add", verifyAccessToken, async (req, res) => {
	const { titre, metier, image, description, lieu, debut, fin, remuneration } =
		req.body;
	const employeur = req.decoded.payloadAvecRole._id;

	try {
		const fulldate = new Date();

		const annee = fulldate.getFullYear();
		const mois = (fulldate.getMonth() + 1).toString().padStart(2, "0");
		const jour = fulldate.getDate().toString().padStart(2, "0");

		const date = `${annee}-${mois}-${jour}`;

		const offre = new Offre({
			titre,
			metier,
			image,
			description,
			lieu,
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

service.put("/offres/employeur/:id", verifyAccessToken, async (req, res) => {
	const { titre, metier, description, debut, fin, remuneration } = req.body;
	const employeur = req.decoded.payloadAvecRole._id;
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

service.delete("/offres/employeur/:id", verifyAccessToken, async (req, res) => {
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

service.post("/offres/chercheur/save", verifyAccessToken, async (req, res) => {
	const id = req.body.id;
	const id_chercheur = req.decoded.payloadAvecRole._id;

	try {
		const chercheur = await Chercheur.findById(id_chercheur);
		if (id) {
			const index = chercheur.enregistrements.indexOf(id);

			if (index === -1) {
				// Enregistrer l'offre si elle n'est pas déja enregistrée
				chercheur.enregistrements.push(id);
				await chercheur.save();
				return res.status(200).json({
					message: "Offre enregistrée",
					enregistrements: chercheur.enregistrements,
				});
			} else {
				// Retirer l'offre des enregistrements sinon
				chercheur.enregistrements.splice(index, 1);
				await chercheur.save();
				return res.status(200).json({
					message: "Offre retirée des enregistrements",
					enregistrements: chercheur.enregistrements,
				});
			}
		} else {
			return res.status(400).json("Aucune offre à enregistrer");
		}
	} catch (error) {
		return res.status(500).json({
			message: "Internal server error",
		});
	}
});

service.get(
	"/offres/chercheur/enregistrements",
	verifyAccessToken,
	async (req, res) => {
		const id_chercheur = req.decoded.payloadAvecRole._id;

		try {
			const chercheur = await Chercheur.findById(id_chercheur).populate({
				path: "enregistrements",
				populate: { path: "employeur" },
			});
			const enregistrements = chercheur.enregistrements;
			return res.status(200).json(enregistrements);
		} catch (error) {
			return res.status(500).json({
				message: "Internal server error",
			});
		}
	}
);

service.post("/offres/chercheur/like", verifyAccessToken, async (req, res) => {
	const id = req.body.id;
	const id_chercheur = req.decoded.payloadAvecRole._id;

	try {
		const chercheur = await Chercheur.findById(id_chercheur);
		if (id) {
			const index = chercheur.favoris.indexOf(id);

			if (index === -1) {
				// Enregistrer l'offre si elle n'est pas déja enregistrée
				chercheur.favoris.push(id);
				await chercheur.save();
				return res.status(200).json({
					message: "Offre ajoutée aux favoris",
					favoris: chercheur.favoris,
				});
			} else {
				// Retirer l'offre des enregistrements sinon
				chercheur.favoris.splice(index, 1);
				await chercheur.save();
				return res.status(200).json({
					message: "Offre retirée des favoris",
					favoris: chercheur.favoris,
				});
			}
		} else {
			return res.status(400).json("Aucune offre à ajouter aux favoris");
		}
	} catch (error) {
		return res.status(500).json({
			message: "Internal server error",
		});
	}
});

service.get(
	"/offres/chercheur/favoris",
	verifyAccessToken,
	async (req, res) => {
		const id_chercheur = req.decoded.payloadAvecRole._id;

		try {
			const chercheur = await Chercheur.findById(id_chercheur).populate({
				path: "favoris",
				populate: { path: "employeur" },
			});
			const favoris = chercheur.favoris;
			return res.status(200).json(favoris);
		} catch (error) {
			return res.status(500).json({
				message: "Internal server error",
			});
		}
	}
);

service.post("/offres/metiers/add", async (req, res) => {
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

service.get("/offres/metiers/:id", async (req, res) => {
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

service.put("/offres/metiers/:id", async (req, res) => {
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

service.delete("/offres/metiers/:id", async (req, res) => {
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

service.post(
	"/offres/employeur/categories/add",
	verifyAccessToken,
	async (req, res) => {
		const { nom, description } = req.body;
		const employeur = req.decoded.payloadAvecRole._id;

		try {
			const categorie = new Categorie({
				nom,
				description,
				employeur,
			});

			const categorieErgst = await categorie.save();

			console.log("Catégorie ajoutée");
			return res.status(201).json(categorieErgst);
		} catch (error) {
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get(
	"/offres/employeur/categories/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const employeur = req.decoded.payloadAvecRole._id;
		try {
			const categorie = await Categorie.findOne({
				_id: id,
				employeur: employeur,
			});
			return res.status(200).json(categorie);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.delete(
	"/offres/employeur/categories/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const employeur = req.decoded.payloadAvecRole._id;
		try {
			const result = await Categorie.deleteOne({
				_id: id,
				employeur: employeur,
			});

			if (result.deletedCount === 0) {
				return res.status(404).json({ message: "Catégorie non trouvée" });
			}

			const offres = await Offre.find({ categorie: id });
			for (const offre of offres) {
				offre.categorie = undefined;
				await offre.save();
			}

			return res
				.status(200)
				.json({ message: "Catégorie supprimée avec succès" });
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/offres/employeur/categories/:id",
	verifyAccessToken,
	async (req, res) => {
		const id = req.params.id;
		const idOffre = req.body.id;
		const employeur = req.decoded.payloadAvecRole._id;
		try {
			if (id !== "0" && id) {
				// Ajout de l'offre dans la catégorie
				const nouvelleCategorie = await Categorie.findOne({
					_id: id,
					employeur: employeur,
				});
				nouvelleCategorie.offres.push(idOffre);
				await nouvelleCategorie.save();

				let offre = await Offre.findById(idOffre);
				let ancienneCategorie = await Categorie.findById(offre.categorie);
				if (ancienneCategorie) {
					ancienneCategorie.offres.pull(idOffre);
					await ancienneCategorie.save();
				}

				offre.categorie = id;
				await offre.save();
			} else {
				let offre = await Offre.findById(idOffre);
				let ancienneCategorie = await Categorie.findById(offre.categorie);
				ancienneCategorie.offres.pull(idOffre);
				await ancienneCategorie.save();

				offre.categorie = undefined;
				await offre.save();
			}

			return res.status(200).json("Mise à jour effectué avec succès");
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

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

registerService("offres", "v1", PORT);

service.listen(PORT, () => console.log("Service is running at port " + PORT));
