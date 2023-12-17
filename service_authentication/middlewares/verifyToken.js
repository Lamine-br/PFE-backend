const jwt = require("jsonwebtoken");

// Middleware function to verify JWT token
function verifyToken(req, res, next) {
	const header = req.headers["authorization"]; // The token is passed in the authorization header

	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Invalid token format" });
	}

	// Extract the token (remove "Bearer " from the token string)
	const token = header.split(" ")[1];

	if (!token) {
		return res.status(401).json({ message: "No token provided" });
	}

	// Verify the token
	jwt.verify(token, `${process.env.JWT_SECRET}`, (err, decoded) => {
		if (err) {
			return res.status(403).json({ message: "Failed to authenticate token" });
		}
		// If token is valid, save decoded information to request object
		req.decoded = decoded;
		next();
	});
}

module.exports = { verifyToken };
