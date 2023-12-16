const jwt = require("jsonwebtoken");

const createAccessToken = (userPayload) => {
	return jwt.sign(
		{
			userPayload,
		},
		`${process.env.JWT_SECRET}`,
		{ expiresIn: `${process.env.JWT_ACCESS_TOKEN_EXPIRES}` }
	);
};

module.exports = { createAccessToken };
