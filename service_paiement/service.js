const express = require("express");
const cors = require("cors");
const Employeur = require("../models/employeur");
const Contact = require("../models/contact");
const Chercheur = require("../models/chercheur");
const connectDB = require("../database/connectDB");
const { verifyAccessToken } = require("./middlewares/verifyAccessToken");

connectDB();

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
