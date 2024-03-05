const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const employeurSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
		},
		password: {
			type: String,
			required: true,
		},
		entreprise: {
			type: String,
			required: true,
		},
		service: {
			type: String,
			required: false,
		},
		sous_service: {
			type: String,
			required: false,
		},
		site_web: {
			type: String,
			required: false,
		},
		linkedin: {
			type: String,
			required: false,
		},
		facebook: {
			type: String,
			required: false,
		},
		adresse: {
			rue: { type: String, required: false },
			ville: { type: String, required: true },
		},
		contacts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Contact",
			},
		],
	},
	{ timestamps: true }
);
const Employeur = mongoose.model("Employeur", employeurSchema);
module.exports = Employeur;
