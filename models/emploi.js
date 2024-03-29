const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emploiSchema = new Schema(
	{
		chercheur: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Chercheur",
		},
		offre: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Offre",
		},
	},
	{ timestamps: true }
);
const Emploi = mongoose.model("Emploi", emploiSchema);
module.exports = Emploi;
