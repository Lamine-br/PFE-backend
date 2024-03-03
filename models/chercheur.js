const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chercheurSchema = new Schema(
	{
		nom: {
			type: String,
			required: true,
		},
		prenom: {
			type: String,
			required: true,
		},
		date_naissance: {
			type: String,
			required: false,
		},
		nationalite: {
			type: String,
			required: false,
		},
		numero: {
			type: String,
			required: false,
		},
		email: {
			type: String,
			required: false,
		},
		ville: {
			type: String,
			required: false,
		},
		cv: {
			type: String,
			required: false,
		},
		candidatures: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Candidature",
			},
		],
	},
	{ timestamps: true }
);
const Chercheur = mongoose.model("Chercheur", chercheurSchema);
module.exports = Chercheur;
