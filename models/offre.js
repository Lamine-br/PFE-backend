const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const offreSchema = new Schema(
	{
		nom: {
			type: String,
			required: true,
		},
		metier: {
			type: String,
			required: false,
		},
		description: {
			type: String,
			required: false,
		},
		debut: {
			type: String,
			required: false,
		},
		fin: {
			type: String,
			required: false,
		},
		remuneration: {
			type: String,
			required: false,
		},
		date: {
			type: String,
			required: false,
		},
		employeurs: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Employeur",
			},
		],
		candidatures: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Candidature",
			},
		],
	},
	{ timestamps: true }
);
const Offre = mongoose.model("Offre", offreSchema);
module.exports = Offre;
