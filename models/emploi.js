const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emploiSchema = new Schema(
	{
		date_debut: {
			type: String,
			required: false,
		},
		date_fin: {
			type: String,
			required: false,
		},
		heure_debut: {
			type: String,
			required: false,
		},
		heure_fin: {
			type: String,
			required: false,
		},
		chercheur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Chercheur",
		},
	},
	{ timestamps: true }
);
const Emploi = mongoose.model("Emploi", emploiSchema);
module.exports = Emploi;
