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

service.post("/employeur/addOffre", verifyAccessToken, async (req, res) => {
	const { nom, metier, description, debut, fin, remuneration, date } = req.body;
	const employeur = req.decoded.userPayload._id;

	try {
		const offre = new Offre({
			nom,
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

service.listen(PORT, () => console.log("Service is running at port " + PORT));