const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const rentalRoutes = require('./routes/rentals');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/rentals', rentalRoutes);

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});