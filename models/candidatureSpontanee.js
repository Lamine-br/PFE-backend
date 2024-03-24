const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const candidatureSpontaneeSchema = new Schema(
	{
		dossier: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Dossier",
		},
		date: {
			type: String,
			required: false,
		},
		chercheur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Chercheur",
		},
		employeur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Employeur",
		},
		etiquettes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Etiquette",
			},
		],
	},
	{ timestamps: true }
);
const CandidatureSpontanee = mongoose.model(
	"CandidatureSpontanee",
	candidatureSpontaneeSchema
);
module.exports = CandidatureSpontanee;
