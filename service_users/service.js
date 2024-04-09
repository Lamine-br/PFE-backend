const express = require("express");
const cors = require("cors");
const Employeur = require("../models/employeur");
const Contact = require("../models/contact");
const Chercheur = require("../models/chercheur");
const connectDB = require("../database/connectDB");
const bcrypt = require("bcrypt");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");
const axios = require("axios");

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
				const chercheur = await Chercheur.findById(userId);
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

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
