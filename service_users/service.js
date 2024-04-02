const express = require("express");
const cors = require("cors");
const Employeur = require("../models/employeur");
const Chercheur = require("../models/chercheur");
const connectDB = require("../database/connectDB");
const bcrypt = require("bcrypt");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");

connectDB();

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

service.get("/profile", verifyAccessToken, async (req, res) => {
	const type = req.decoded.payloadAvecRole.type;
	const userId = req.decoded.payloadAvecRole._id;
	try {
		switch (type) {
			case "employeur":
				const employeur = await Employeur.findById(userId);
				if (!employeur) {
					return res.status(404).json("Employeur non trouvé");
				}

				const contacts = await Contact.find({
					_id: { $in: employeur.contacts },
				});
				employeur.contacts = contacts;
				res.status(200).json(employeur);
			case "chercheur":
				const chercheur = await Chercheur.findById(userId);
				if (!chercheur) {
					return res.status(404).json("Chercheur non trouvé");
				}
				res.status(200).json(chercheur);
		}
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.put("/profile", verifyAccessToken, async (req, res) => {
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
	}
});

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
