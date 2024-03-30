const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("../database/connectDB");
const authRouter = require("./routers/authRouter");
const offreRouter = require("./routers/offreRouter");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

service.use("/auth", authRouter);

connectDB();

service.listen(PORT, () => console.log("Service is running at port " + PORT));
