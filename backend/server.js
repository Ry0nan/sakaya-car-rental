
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectToAivenMySQL } = require('./database');
const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const rentalRoutes = require('./routes/rentals');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use(express.json());
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve assets for car images
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use('/api/assets', express.static(path.join(__dirname, '../frontend/assets')));

// Handle 404 for assets to prevent infinite loops
app.use('/assets/*', (req, res) => {
    console.log(`Asset not found: ${req.path}`);
    res.status(404).send('Asset not found');
});

app.use('/api/uploads/*', (req, res) => {
    console.log(`Upload not found: ${req.path}`);
    res.status(404).send('Upload not found');
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/feedback', feedbackRoutes);

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect to database and start server
async function startServer() {
    try {
        await connectToAivenMySQL();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
