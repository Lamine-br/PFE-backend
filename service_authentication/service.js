const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("../database/connectDB");
const authRouter = require("./routers/authRouter");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true, limit: "50mb" }));
service.use(express.json({ limit: "50mb" }));

service.use(express.static("public"));

service.use("/auth", authRouter);

connectDB();

service.listen(PORT, () => console.log("Service is running at port " + PORT));
