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
		numero_EDA: {
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
		valide: {
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
		candidatures_spontanees: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "CandidatureSpontanee",
			},
		],
		reponses: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Reponse",
			},
		],
		etiquettes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Etiquette",
			},
		],
		categories: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Categorie",
			},
		],
		notifications: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Notification",
			},
		],
		bloques: [
			[
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: "Bloque",
				},
			],
		],
		signalements: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Signalement",
			},
		],
		bloques_partage: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "BloquePartage",
			},
		],
		abonnement: {
			debut: { type: String, required: false },
			fin: { type: String, required: false },
			abonnement_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Abonnement",
			},
			paiement_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Paiement",
			},
		},
	},
	{ timestamps: true }
);
const Employeur = mongoose.model("Employeur", employeurSchema);
module.exports = Employeur;
