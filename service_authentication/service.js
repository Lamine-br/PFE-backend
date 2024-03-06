const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Chercheur = require("../models/chercheur");
const Employeur = require("../models/employeur");
const Contact = require("../models/contact");
const connectDB = require("../database/connectDB");
require("dotenv").config();
const { verifyRefreshToken } = require("./middlewares/verifyRefreshToken");

const { createAccessToken, createRefreshToken } = require("./utils/tokens");

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

		// Password is valid, create an access token and a refresh token
		let accessToken = createAccessToken(user);
		let refreshToken = createRefreshToken(user);

		return res.status(200).json({
			message: "User successfully logged in",
			accessToken,
			refreshToken,
		});
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

service.post("/auth/register/chercheur", async (req, res) => {
	const {
		email,
		password,
		nom,
		prenom,
		date_naissance,
		nationalite,
		numero,
		ville,
		cv,
	} = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Username or password missing" });
	}

	try {
		// Hash the password before saving it
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new User instance with hashed password
		const chercheur = new Chercheur({
			email,
			password: hashedPassword,
			nom,
			prenom,
			date_naissance,
			nationalite,
			numero,
			ville,
			cv,
		});

		// Save the user to the database
		const chercheurEngst = await chercheur.save();

		console.log("User added");
		return res.status(201).json(chercheurEngst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/auth/register/employeur", async (req, res) => {
	const {
		email,
		password,
		entreprise,
		service,
		sous_service,
		numero_EDA,
		site_web,
		linkedin,
		facebook,
		adresse,
		contacts,
	} = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "email or password missing" });
	}

	try {
		// Hash the password before saving it
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new User instance with hashed password
		const employeur = new Employeur({
			email,
			password: hashedPassword,
			entreprise,
			service,
			sous_service,
			numero_EDA,
			site_web,
			linkedin,
			facebook,
			adresse,
		});

		const savedContacts = await Promise.all(
			contacts.map(async (contactData) => {
				const contactInstance = new Contact(contactData);
				return await contactInstance.save();
			})
		);

		employeur.contacts = savedContacts.map((contact) => contact._id);

		// Save the user to the database
		const employeurEngst = await employeur.save();

		console.log("User added");
		return res.status(201).json(employeurEngst);
	} catch (error) {
		return res.status(500).json({ message: "Internal server error" });
	}
});

service.post("/auth/refresh", verifyRefreshToken, (req, res) => {
	const user = req.decoded.user;
	const newAccessToken = createAccessToken(user);
	res.status(200).json({ accessToken: newAccessToken });
});

service.listen(PORT, () => console.log("Service is running at port " + PORT));
