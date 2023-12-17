const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const User = require("../models/users");
const connectDB = require("../database/connectDB");
require("dotenv").config();
const { verifyToken } = require("./middlewares/verifyToken");

const { createAccessToken } = require("./utils/tokens");

const service = express();
const PORT = 3000;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

connectDB();

service.post("/auth/login", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Email or Password missing" });
	}

	try {
		// Find the user by email in the database
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Compare the provided password with the hashed password stored in the database
		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		// Password is valid, create a JWT token for authentication
		let accessToken = createAccessToken(user);

		return res
			.status(200)
			.json({ message: "User successfully logged in", accessToken });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/auth/register", async (req, res) => {
	const { firstName, lastName, email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Username or password missing" });
	}

	try {
		// Hash the password before saving it
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new User instance with hashed password
		const user = new User({
			firstName,
			lastName,
			email,
			password: hashedPassword,
		});

		// Save the user to the database
		const savedUser = await user.save();

		console.log("User added");
		return res.status(201).json(savedUser);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/auth/refreshToken", verifyToken, (req, res) => {
	return res.status(201).json({ message: "Hi there" });
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
