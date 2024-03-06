const express = require("express");
const cors = require("cors");
const Employeur = require("../models/employeur");
const Offre = require("../models/offre");
const connectDB = require("../database/connectDB");
require("dotenv").config();

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.post("/employeur/offre", async (req, res) => {
	const { offre } = req.body;

	try {
		const nouvelleOffre = new Offre({
			offre,
		});

		const offreErgst = await nouvelleOffre.save();

		console.log("Offre ajoutée");
		return res.status(201).json(offreErgst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
