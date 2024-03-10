const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 8000;

app.use(cors({ origin: "*" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Create routers for different microservices
const authRouter = express.Router();
const userRouter = express.Router();

// Router 1
authRouter.all(
	"*",
	createProxyMiddleware({
		target: "http://localhost:3000",
		changeOrigin: true,
	})
);

// Router 2
userRouter.all(
	"*",
	createProxyMiddleware({
		target: "http://localhost:3001",
		changeOrigin: true,
	})
);

// Associate routers with different paths
app.use("/auth", authRouter);
app.use("/employeur", userRouter);

// Default route
app.use("*", (req, res) => {
	res.status(404).send("Route not found");
});

app.listen(PORT, () => {
	console.log(`API Gateway listening on port ${PORT}`);
});
