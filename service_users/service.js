const express = require("express");
const cors = require("cors");
const Employeur = require("../models/employeur");
const Contact = require("../models/contact");
const Chercheur = require("../models/chercheur");
const Groupe = require("../models/groupe");
const Signalement = require("../models/signalement");
const Offre = require("../models/offre");
const Avertissement = require("../models/avertissement");
const Alerte = require("../models/alerte");
const Bloque = require("../models/bloque");
const connectDB = require("../database/connectDB");
const bcrypt = require("bcrypt");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");
const moment = require("moment");

connectDB();

const service = express();
const PORT = 3006;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

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
registerService("users", "v1", PORT);

service.get("/users/profile", verifyAccessToken, async (req, res) => {
	const type = req.decoded.payloadAvecRole.type;
	const userId = req.decoded.payloadAvecRole._id;
	switch (type) {
		case "employeur":
			try {
				const employeur = await Employeur.findById(userId).populate("contacts");

				if (!employeur) {
					return res.status(404).json("Employeur non trouvé");
				}
				res.status(200).json(employeur);
				break;
			} catch (error) {
				return res.status(500).json({ message: "Internal server error" });
			}

		case "chercheur":
			try {
				const chercheur = await Chercheur.findById(userId).populate("alertes");
				if (!chercheur) {
					return res.status(404).json("Chercheur non trouvé");
				}
				res.status(200).json(chercheur);
				break;
			} catch (error) {
				return res.status(500).json({ message: "Internal server error" });
			}
	}
});

service.put("/users/profile", verifyAccessToken, async (req, res) => {
	const userId = req.decoded.payloadAvecRole._id;
	const type = req.decoded.payloadAvecRole.type;

	switch (type) {
		case "chercheur":
			try {
				const {
					email,
					newPassword,
					oldPassword,
					nom,
					prenom,
					nationalite,
					ville,
					numero,
					cv,
				} = req.body;
				const chercheur = await Chercheur.findById(userId);
				if (!chercheur) {
					return res.status(404).json({ message: "Chercheur introuvable" });
				}
				if (email) chercheur.email = email;

				if (newPassword) {
					console.log(chercheur, newPassword);
					const isPasswordValid = await bcrypt.compare(
						oldPassword,
						chercheur.password
					);
					if (isPasswordValid) {
						chercheur.password = await bcrypt.hash(newPassword, 10);
					} else {
						return res.status(400).json({ message: "Mot de passe incorrect" });
					}
				}

				if (nom) chercheur.nom = nom;
				if (prenom) chercheur.prenom = prenom;
				if (nationalite) chercheur.nationalite = nationalite;
				if (ville) chercheur.ville = ville;
				if (numero) chercheur.numero = numero;
				if (cv) chercheur.cv = cv;

				await chercheur.save();
				return res.status(200).json({
					user: {
						type: "chercheur",
						email: chercheur.email,
						username: chercheur.nom + " " + chercheur.prenom,
						image: "",
					},
				});
			} catch (error) {
				console.error(error);
				return res.status(500).json({ message: "Internal server error" });
			}
		case "employeur":
			try {
				const {
					email,
					oldPassword,
					newPassword,
					entreprise,
					service,
					sous_service,
					numero_EDA,
					site_web,
					linkedin,
					facebook,
					rue,
					ville,
					spontanee,
					contact,
				} = req.body;
				const employeur = await Employeur.findById(userId);
				if (!employeur) {
					return res.status(404).json({ message: "Employeur introuvable" });
				}
				if (email) employeur.email = email;
				if (newPassword) {
					console.log(employeur, newPassword);
					const isPasswordValid = await bcrypt.compare(
						oldPassword,
						employeur.password
					);
					if (isPasswordValid) {
						employeur.password = await bcrypt.hash(newPassword, 10);
					} else {
						return res.status(400).json({ message: "Mot de passe incorrect" });
					}
				}

				if (entreprise) employeur.entreprise = entreprise;
				if (service) employeur.service = service;
				if (sous_service) employeur.sous_service = sous_service;
				if (numero_EDA) employeur.numero_EDA = numero_EDA;
				if (site_web) employeur.site_web = site_web;
				if (facebook) employeur.facebook = facebook;
				if (linkedin) employeur.linkedin = linkedin;
				if (rue) employeur.adresse.rue = rue;
				if (ville) employeur.adresse.ville = ville;
				if (spontanee !== null) employeur.spontanee = spontanee;

				if (contact) {
					const existingContact = await Contact.findById(contact.id);
					if (contact.nom) {
						existingContact.nom = contact.nom;
					}
					if (contact.email) {
						existingContact.email = contact.email;
					}
					if (contact.numero) {
						existingContact.numero = contact.numero;
					}
					await existingContact.save();
				}

				await employeur.save();
				return res.status(200).json({
					user: {
						type: "employeur",
						email: employeur.email,
						username: employeur.entreprise,
						image: "",
					},
				});
			} catch (error) {
				console.error(error);
				return res.status(500).json({ message: "Internal server error" });
			}
	}
});

service.get("/users/employeurs", async (req, res) => {
	try {
		const employeurs = await Employeur.find({ valide: "Validé" });

		if (!employeurs) {
			return res.status(404).json("Employeurs introuvables");
		}
		res.status(200).json(employeurs);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/users/signaler", verifyAccessToken, async (req, res) => {
	const emetteur = req.decoded.payloadAvecRole._id;
	const type_emetteur = req.decoded.payloadAvecRole.type;
	const { titre, contenu, destinataire, type_destinataire } = req.body;
	try {
		const signalement = new Signalement({
			titre,
			contenu,
			type_emetteur,
			emetteur,
			type_destinataire,
			destinataire,
		});

		const savedSignalement = await signalement.save();

		const chercheur = await Chercheur.findById(destinataire);
		chercheur.signalements.push(signalement._id);
		chercheur.save();

		res.status(201).json(savedSignalement);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/users/bloquer", verifyAccessToken, async (req, res) => {
	const emetteur = req.decoded.payloadAvecRole._id;
	const type_emetteur = req.decoded.payloadAvecRole.type;
	const { motif, destinataire, type_destinataire } = req.body;
	try {
		const bloque = new Bloque({
			motif,
			type_emetteur,
			emetteur,
			type_destinataire,
			destinataire,
		});

		const savedBloque = await bloque.save();

		res.status(201).json(savedBloque);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/users", async (req, res) => {
	try {
		const employeurs = await Employeur.find({ valide: "Validé" });
		const chercheurs = await Chercheur.find();
		return res
			.status(200)
			.json({ employeurs: employeurs, chercheurs: chercheurs });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/users/bloquerUser", async (req, res) => {
	try {
		const { type, id } = req.body;
		switch (type) {
			case "employeur":
				await Employeur.updateOne({ _id: id }, { bloque: true });
				console.log("Utilisateur bloqué");
				return res.status(200).json("Utilisateur  bloqué");
			case "chercheur":
				await Chercheur.updateOne({ _id: id }, { bloque: true });
				console.log("Utilisateur bloqué");
				return res.status(200).json("Utilisateur  bloqué");
			default:
				return res.status(400).json("Veuillez désigner le type");
		}
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/users/debloquerUser", async (req, res) => {
	try {
		const { type, id } = req.body;
		switch (type) {
			case "employeur":
				await Employeur.updateOne({ _id: id }, { bloque: false });
				console.log("Utilisateur bloqué");
				return res.status(200).json("Utilisateur  débloqué");
			case "chercheur":
				await Chercheur.updateOne({ _id: id }, { bloque: false });
				console.log("Utilisateur bloqué");
				return res.status(200).json("Utilisateur  débloqué");
			default:
				return res.status(400).json("Veuillez désigner le type");
		}
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/users/avertirUser", async (req, res) => {
	const emetteur = "660c0eaa42351aa9a67e559a";
	const type_emetteur = "gestionnaire";
	const { titre, contenu, destinataire, type_destinataire } = req.body;
	try {
		const avertissement = new Avertissement({
			type_emetteur,
			emetteur,
			type_destinataire,
			destinataire,
			titre,
			contenu,
		});

		const savedAvertissement = await avertissement.save();

		switch (type_destinataire) {
			case "employeur":
				const employeur = await Employeur.findById(destinataire);
				employeur.avertissements.push(savedAvertissement._id);
				employeur.save();
				break;
			case "chercheur":
				const chercheur = await Chercheur.findById(destinataire);
				chercheur.avertissements.push(savedAvertissement._id);
				chercheur.save();
				break;
		}
		res.status(201).json(savedAvertissement);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/users/chercheurs/:id", async (req, res) => {
	try {
		const userId = req.params.id;
		const chercheur = await Chercheur.findById(userId).populate(
			"avertissements signalements"
		);

		if (!chercheur) {
			return res.status(404).json("Chercheur introuvable");
		}
		res.status(200).json(chercheur);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.get("/users/employeurs/:id", async (req, res) => {
	try {
		const userId = req.params.id;
		const employeur = await Employeur.findById(userId).populate(
			"contacts avertissements"
		);

		if (!employeur) {
			return res.status(404).json("Employeur introuvable");
		}
		res.status(200).json(employeur);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post(
	"/users/chercheur/addGroupe",
	verifyAccessToken,
	async (req, res) => {
		try {
			const { nom, description } = req.body;
			const chercheur = req.decoded.payloadAvecRole._id;

			const groupe = new Groupe({
				nom,
				description,
				createur: chercheur,
				membres: [chercheur],
			});

			const savedGroupe = await groupe.save();

			const existingChercheur = await Chercheur.findById(chercheur);
			existingChercheur.groupes.push(savedGroupe._id);
			existingChercheur.save();

			res.status(201).json(savedGroupe);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.get("/users/chercheur/groupes", verifyAccessToken, async (req, res) => {
	try {
		const chercheur = req.decoded.payloadAvecRole._id;

		const existingChercheur = await Chercheur.findById(chercheur).populate({
			path: "groupes",
			populate: [
				{ path: "membres" },
				{ path: "createur" },
				{ path: "offres", populate: [{ path: "offre" }, { path: "emetteur" }] },
			],
		});

		return res.status(200).json(existingChercheur.groupes);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post(
	"/users/chercheur/addUserToGroupe",
	verifyAccessToken,
	async (req, res) => {
		try {
			const { id, email, numero } = req.body;
			const chercheur = req.decoded.payloadAvecRole._id;

			const groupe = await Groupe.findById(id);
			if (chercheur.toString() !== groupe.createur.toString()) {
				res.status(403).json("Non autorisé");
			}

			if (email) {
				const existingChercheur = await Chercheur.findOne({ email: email });
				// Si l'utilisateur existe, l'ajouter dans le groupe
				if (existingChercheur) {
					groupe.membres.push(existingChercheur._id);
					await groupe.save();
					existingChercheur.groupes.push(groupe._id);
					await existingChercheur.save();
					res.status(200).json("Chercheur ajouté");
				} else {
					// Si l'utilisateur n'existe pas envoyer un mail
					res.status(200).json("Chercheur avec ce mail n'existe pas");
				}
			}

			if (numero) {
				const existingChercheur = await Chercheur.findOne({ numero: numero });
				// Si l'utilisateur existe, l'ajouter dans le groupe
				if (existingChercheur) {
					groupe.membres.push(existingChercheur._id);
					await groupe.save();
					existingChercheur.groupes.push(groupe._id);
					await existingChercheur.save();
					res.status(200).json("Chercheur ajouté");
				} else {
					// Si l'utilisateur n'existe pas envoyer un SMS
					res.status(200).json("Chercheur avec ce numero n'existe pas");
				}
			}
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.post(
	"/users/chercheur/partagerOffreDansGroupe",
	verifyAccessToken,
	async (req, res) => {
		try {
			const { id_groupe, offre } = req.body;
			const chercheur = req.decoded.payloadAvecRole._id;

			const groupe = await Groupe.findById(id_groupe);
			groupe.offres.push({
				offre: offre,
				emetteur: chercheur,
				date: moment().format("YYYY-MM-DD à HH:mm"),
			});
			await groupe.save();
			return res
				.status(200)
				.json({ message: "Offre partagée dans le groupe avec succès" });
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}
);

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
