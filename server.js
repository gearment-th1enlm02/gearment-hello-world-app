const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./src/config');
const routes = require('./src/routes');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api', routes);

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});