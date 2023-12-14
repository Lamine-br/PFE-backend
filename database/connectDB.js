const mongoose = require("mongoose");

const connectDB = async () => {
	try {
		// MongoDB connection URL
		const DB_URL = "mongodb://127.0.0.1:27017/test";

		await mongoose.connect(DB_URL);

		console.log("Connected to MongoDB!");
	} catch (error) {
		console.error("Connection to MongoDB failed:", error);
	}
};

module.exports = connectDB;
