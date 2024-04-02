const multer = require("multer");

// Set up the multer storage options
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "./public/uploads");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(
			null,
			file.fieldname +
				"-" +
				uniqueSuffix +
				"." +
				file.originalname.split(".").pop()
		);
	},
});
const upload = multer({ storage: storage });

module.exports = { upload };
