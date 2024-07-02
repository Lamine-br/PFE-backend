const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("../database/connectDB");
const authRouter = require("./routers/authRouter");
const axios = require("axios");
const amqp = require("amqplib/callback_api");
const jwt = require("jsonwebtoken");

const service = express();
const PORT = 3002;

service.use(cors({ origin: "*" }));
service.use(express.urlencoded({ extended: true, limit: "50mb" }));
service.use(express.json({ limit: "50mb" }));

service.use(express.static("public"));

service.use("/auth", authRouter);

connectDB();

service.use((req, res, next) => {
	console.log(`Request received: ${req.method} ${req.url}`);
	next();
});

const registerService = async (serviceName, serviceVersion, servicePort) => {
	try {
		const response = await axios.put(
			`http://localhost:3001/register/${serviceName}/${serviceVersion}/${servicePort}`
		);
		console.log(response.data); // Log the response from the registry service
	} catch (error) {
		console.error("Error registering service:", error);
	}
};

function validateToken(token, callback) {
	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
		if (err) {
			callback(null, false);
		} else {
			callback(decoded, true);
		}
	});
}

// Connect to RabbitMQ
amqp.connect("amqp://localhost", function (error0, connection) {
	if (error0) {
		throw error0;
	}
	connection.createChannel(function (error1, channel) {
		if (error1) {
			throw error1;
		}
		const exchangeName = "authExchange";
		const requestQueue = "auth_request_queue";

		channel.assertExchange(exchangeName, "direct", { durable: false });
		channel.assertQueue(requestQueue, { durable: false });
		channel.bindQueue(requestQueue, exchangeName, "authRequest");

		channel.consume(requestQueue, function (msg) {
			const token = msg.content.toString();
			validateToken(token, (decoded, isValid) => {
				const response = {
					isValid: isValid,
					user: decoded,
				};
				console.log(response);

				channel.sendToQueue(
					msg.properties.replyTo,
					Buffer.from(JSON.stringify(response)),
					{
						correlationId: msg.properties.correlationId,
					}
				);
				const serviceName = msg.properties.correlationId.split(":")[0];
				console.log(
					"Response sent to",
					serviceName,
					"in",
					msg.properties.replyTo
				);

				channel.ack(msg);
			});
		});
	});
});

registerService("auth", "v1", PORT);

service.listen(PORT, () => console.log("Service is running at port " + PORT));
