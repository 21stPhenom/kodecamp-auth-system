const express = require('express');
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// connect to db
const db_connection = mongoose.connect(process.env.mongodbURL);
db_connection.then(() => {
    console.log("Database connection established successfully");
}).catch((error) => {
    console.log(error);
});

// register middleware and router
const authRoute = require("./routes/authRoutes.js");
app.use(cors({
    origin: "*"
}));
app.use(express.json());

app.use('/v1/auth', authRoute);


// start server
app.listen(4000, () => {
    console.log("Listening on port 4000...");
});

module.exports = app;