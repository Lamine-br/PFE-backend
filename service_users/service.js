const express = require("express");
const cors = require("cors");
const User = require("../models/users");
const connectDB = require("../database/connectDB");

connectDB();

const service = express();
const PORT = 3001;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true }));
service.use(express.json());

service.use("/user", (req, res, next) => {
	// Middleware which tells that the user is authenticated or not

	if (req.session.authorization) {
		let token = req.session.authorization["accessToken"]; // Access Token

		jwt.verify(token, "access", (err, user) => {
			if (!err) {
				req.user = user;
				next();
			} else {
				return res.status(403).json({ message: "User not authenticated" });
			}
		});
	} else {
		return res.status(403).json({ message: "User not logged in" });
	}
});

service.get("/user", (req, res) => {
	res.send("Users Microservice");
});

service.get("/user/get-users", (req, res) => {
	User.find()
		.then((result) => {
			res.send(result);
		})
		.catch((err) => console.log(err));
});

service.delete("/user/users/:id", (req, res) => {
	const id = req.params.id;
	User.findByIdAndDelete(id).then((result) => {
		console.log("User deleted");
	});
});

// Start the server
service.listen(PORT, () => {
	console.log(`service running on port ${PORT}`);
});
