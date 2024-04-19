const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chercheurSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
		},
		password: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			required: true,
		},
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
		ville: {
			type: String,
			required: false,
		},
		cv: {
			type: String,
			required: false,
		},
		bloque: {
			type: Boolean,
			required: false,
		},
		amis: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Chercheur",
			},
		],
		groupes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Groupe",
			},
		],
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
		favoris: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Offre",
			},
		],
		enregistrements: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Offre",
			},
		],
		alertes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Alerte",
			},
		],
		emplois: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Emploi",
			},
		],
		signalements: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Signalement",
			},
		],
		criteres_notification: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "CritereNotification",
			},
		],
		bloques_partage: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "BloquePartage",
			},
		],
	},
	{ timestamps: true }
);
const Chercheur = mongoose.model("Chercheur", chercheurSchema);
module.exports = Chercheur;
