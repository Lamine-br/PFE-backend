const amqp = require("amqplib");
require("dotenv").config();

async function verifyAccessToken(req, res, next) {
	const header = req.headers["authorization"];

	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Invalid token format" });
	}

	const token = header.split(" ")[1];

	if (!token) {
		return res.status(401).json({ message: "No token provided" });
	}

	try {
		// Connect to RabbitMQ
		const connection = await amqp.connect("amqp://localhost");
		const channel = await connection.createChannel();

		const exchangeName = "authExchange";
		const responseQueue = await channel.assertQueue("", { exclusive: true });

		await channel.assertExchange(exchangeName, "direct", { durable: false });

		const correlationId = generateUuid();

		// Send the request
		channel.publish(exchangeName, "authRequest", Buffer.from(token), {
			correlationId: correlationId,
			replyTo: responseQueue.queue,
		});

		// Listen for the response
		channel.consume(
			responseQueue.queue,
			(msg) => {
				console.log(msg);
				if (msg.properties.correlationId === correlationId) {
					const response = JSON.parse(msg.content.toString());
					console.log(response);

					if (response.isValid) {
						req.decoded = response.user;
						next();
					} else {
						res.status(403).json({ message: "Failed to authenticate token" });
					}

					setTimeout(() => {
						connection.close();
					}, 500);
				}
			},
			{ noAck: true }
		);

		console.log(`${correlationId} is sent to exchange ${exchangeName}`);
	} catch (error) {
		console.error("Error connecting to RabbitMQ", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
}

function generateUuid() {
	return (
		Math.random().toString() +
		Math.random().toString() +
		Math.random().toString()
	);
}

module.exports = { verifyAccessToken };
