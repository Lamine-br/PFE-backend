const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema(
	{
		nom: {
			type: String,
			required: true,
		},
		prenom: {
			type: String,
			required: true,
		},
		numero: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);
const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;
