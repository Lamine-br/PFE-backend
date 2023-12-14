const express = require("express");
const app = express();
const PORT = 4000;
const connectDB = require("../database/connectDB");

connectDB();

app.get("/", (req, res) => {
	res.send("Welcome to your Express microservice!");
});

// This microservice will register the services available

// Start the server
app.listen(PORT, () => {
	console.log(`Service running on port ${PORT}`);
});
