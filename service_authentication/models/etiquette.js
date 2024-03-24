const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const etiquetteSchema = new Schema(
	{
		nom: {
			type: String,
			required: false,
		},
		employeur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Employeur",
		},
		candidatures: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Candidature",
			},
		],
		candidatures_spontanees: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "CandidatureSpontanee",
			},
		],
	},
	{ timestamps: true }
);

const Etiquette = mongoose.model("Etiquette", etiquetteSchema);
module.exports = Etiquette;
