const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const candidatureSchema = new Schema(
	{
		cv: {
			type: String,
			required: true,
		},
		motivation: {
			type: String,
			required: false,
		},
		commentaire: {
			type: String,
			required: false,
		},
		date: {
			type: String,
			required: false,
		},
		employeur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Employeur",
		},
		offre: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Offre",
		},
	},
	{ timestamps: true }
);
const Candidature = mongoose.model("Candidature", candidatureSchema);
module.exports = Candidature;
