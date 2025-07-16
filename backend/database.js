const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.join(__dirname, "./ca.pem")),
    },
};

let db;

async function connectToAivenMySQL() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log("Connected to Aiven for MySQL!");

        const [rows] = await db.execute("SELECT VERSION() as version");
        console.log("MySQL Version:", rows[0].version);
        console.log(`JavaWheels server running on port ${process.env.PORT || 5000}`);
        console.log(`Access the application at http://0.0.0.0:${process.env.PORT || 5000}`);

        // Initialize database tables
        await initializeDatabase();

    } catch (error) {
        console.error("Error connecting to Aiven for MySQL:", error);
        process.exit(1);
    }
}

const initializeDatabase = async () => {
    try {
        console.log("Initializing database tables...");

        // Users table
        await db.execute(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            isAdmin BOOLEAN DEFAULT FALSE,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Cars table
        await db.execute(`CREATE TABLE IF NOT EXISTS cars (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image VARCHAR(500),
            description TEXT,
            seats INT DEFAULT 4,
            isAvailable BOOLEAN DEFAULT TRUE,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Cart table
        await db.execute(`CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            carId INT NOT NULL,
            startDate DATE NOT NULL,
            endDate DATE NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id),
            FOREIGN KEY (carId) REFERENCES cars (id)
        )`);

        // Rentals table
        await db.execute(`CREATE TABLE IF NOT EXISTS rentals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            carId INT NOT NULL,
            startDate DATE NOT NULL,
            endDate DATE NOT NULL,
            totalPrice DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id),
            FOREIGN KEY (carId) REFERENCES cars (id)
        )`);


        console.log("Database tables created successfully");

        // Insert admin user and sample data
        await insertInitialData();

    } catch (error) {
        console.error("Error initializing database:", error);
        throw error;
    }
};

const insertInitialData = async () => {
    try {
        // Check if admin exists
        const [adminExists] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [process.env.ADMIN_EMAIL || 'admin@example.com']
        );

        if (adminExists.length === 0) {
            const hashedPassword = await bcrypt.hash(
                process.env.ADMIN_PASSWORD || 'admin123',
                10
            );
            await db.execute(
                "INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, ?)",
                ["Admin", process.env.ADMIN_EMAIL || 'admin@example.com', hashedPassword, true]
            );
            console.log("Admin user created");
        }

        // Check if sample cars exist
        const [carCount] = await db.execute("SELECT COUNT(*) as count FROM cars");
        if (carCount[0].count === 0) {
            const sampleCars = [
                ["Toyota RAV4", "suv", 75.00, "/assets/toyota-rav4.jpg", "Spacious and reliable SUV perfect for family trips", 5],
                ["Honda Pilot", "suv", 85.00, "/assets/honda-pilot.jpg", "Premium 8-seater SUV with advanced safety features", 8],
                ["Ford Transit", "van", 95.00, "/assets/ford-transit.jpg", "Spacious van ideal for group travel or cargo", 12],
                ["Chevrolet Express", "van", 90.00, "/assets/chevy-express.jpg", "Reliable passenger van with comfortable seating", 15],
                ["Toyota Camry", "sedan", 55.00, "/assets/toyota-camry.jpg", "Elegant sedan with excellent fuel efficiency", 5],
                ["Honda Accord", "sedan", 60.00, "/assets/honda-accord.jpg", "Luxury sedan with smooth ride and modern features", 5],
                ["Nissan Altima", "sedan", 58.00, "/assets/nissan-altima.jpg", "Comfortable sedan with spacious interior", 5],
                ["Mazda CX-5", "suv", 70.00, "/assets/mazda-cx5.jpg", "Stylish compact SUV with great handling", 5]
            ];

            for (const car of sampleCars) {
                await db.execute(
                    "INSERT INTO cars (name, category, price, image, description, seats) VALUES (?, ?, ?, ?, ?, ?)",
                    car
                );
            }
            console.log("Sample cars inserted");
        }
    } catch (error) {
        console.error("Error inserting initial data:", error);
        throw error;
    }
};

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectToAivenMySQL();

    // Note: app should be defined in server.js, not here
    console.log(`Server ready to start on port ${PORT}`);
}

module.exports = { db, initializeDatabase, connectToAivenMySQL };

// Only start if this file is run directly
if (require.main === module) {
    startServer().catch(console.error);
}