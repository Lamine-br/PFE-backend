const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const groupeSchema = new Schema(
	{
		nom: {
			type: String,
			required: false,
		},
		description: {
			type: String,
			required: false,
		},
		createur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Chercheur",
		},
		membres: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Chercheur",
			},
		],
		offres: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Offres",
			},
		],
	},
	{ timestamps: true }
);
const Groupe = mongoose.model("Groupe", groupeSchema);
module.exports = Groupe;
