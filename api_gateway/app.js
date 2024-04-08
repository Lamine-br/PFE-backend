const express = require("express");
const app = express();
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");

const PORT = 3000;

app.get("/", (req, res) => {
	res.send("Hello, Express!");
});

app.use((req, res, next) => {
	console.log(`Request received: ${req.method} ${req.url}`);
	next();
});

async function fetchServiceUrlFromRegistry(servicename, serviceversion) {
	try {
		const response = await axios.get(
			`http://localhost:3001/find/${servicename}/${serviceversion}`
		);
		return response.data; // Assuming the response is a single service URL
	} catch (error) {
		return null;
	}
}

// Define the list of services
const services = [
	{ name: "auth", version: "v1", path: "/auth" },
	{ name: "offres", version: "v1", path: "/offres" },
	{ name: "candidatures", version: "v1", path: "/candidatures" },
	{ name: "emplois", version: "v1", path: "/emplois" },
	{ name: "users", version: "v1", path: "/users" },
	{ name: "notifications", version: "v1", path: "/notifications" },
	{ name: "abonnements", version: "v1", path: "/abonnements" },
	{ name: "paiements", version: "v1", path: "/paiements" },
	// Add more services as needed
];

// Map services to create proxies dynamically
services.forEach(async (service) => {
	const serviceInfo = await fetchServiceUrlFromRegistry(
		service.name,
		service.version
	);
	if (serviceInfo) {
		const serviceUrl = `http://${serviceInfo.ip}:${serviceInfo.port}/${service.name}`;
		const serviceProxy = createProxyMiddleware({
			target: serviceUrl,
			changeOrigin: true,
		});
		console.log(`Service ${service.name} URL:`, serviceUrl);
		app.use(service.path, serviceProxy);
	} else {
		console.log(`Service ${service.name} not found in registry.`);
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
