const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'sakaya.db'));

const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                isAdmin BOOLEAN DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Cars table
            db.run(`CREATE TABLE IF NOT EXISTS cars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                image TEXT,
                description TEXT,
                isAvailable BOOLEAN DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Rentals table
            db.run(`CREATE TABLE IF NOT EXISTS rentals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                carId INTEGER NOT NULL,
                startDate DATE NOT NULL,
                endDate DATE NOT NULL,
                totalPrice REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (carId) REFERENCES cars (id)
            )`);

            // Cart table
            db.run(`CREATE TABLE IF NOT EXISTS cart (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                carId INTEGER NOT NULL,
                startDate DATE NOT NULL,
                endDate DATE NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (carId) REFERENCES cars (id)
            )`);

            // Insert admin user and sample data
            insertInitialData();
            resolve();
        });
    });
};

const insertInitialData = () => {
    // Check if admin exists
    db.get("SELECT * FROM users WHERE email = ?", [process.env.ADMIN_EMAIL], async (err, admin) => {
        if (!admin) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            db.run("INSERT INTO users (name, email, password, isAdmin) VALUES (?, ?, ?, ?)",
                ['Admin', process.env.ADMIN_EMAIL, hashedPassword, 1]);
        }
    });

    // Check if sample cars exist
    db.get("SELECT COUNT(*) as count FROM cars", (err, result) => {
        if (result.count === 0) {
            const sampleCars = [
                ['Toyota RAV4', 'suv', 75, '/assets/toyota-rav4.jpg', 'Spacious and reliable SUV perfect for family trips'],
                ['Honda Pilot', 'suv', 85, '/assets/honda-pilot.jpg', 'Premium 8-seater SUV with advanced safety features'],
                ['Ford Transit', 'van', 95, '/assets/ford-transit.jpg', 'Spacious van ideal for group travel or cargo'],
                ['Chevrolet Express', 'van', 90, '/assets/chevy-express.jpg', 'Reliable passenger van with comfortable seating'],
                ['Toyota Camry', 'sedan', 55, '/assets/toyota-camry.jpg', 'Elegant sedan with excellent fuel efficiency'],
                ['Honda Accord', 'sedan', 60, '/assets/honda-accord.jpg', 'Luxury sedan with smooth ride and modern features'],
                ['Nissan Altima', 'sedan', 58, '/assets/nissan-altima.jpg', 'Comfortable sedan with spacious interior'],
                ['Mazda CX-5', 'suv', 70, '/assets/mazda-cx5.jpg', 'Stylish compact SUV with great handling']
            ];

            const stmt = db.prepare("INSERT INTO cars (name, category, price, image, description) VALUES (?, ?, ?, ?, ?)");
            sampleCars.forEach(car => stmt.run(car));
            stmt.finalize();
        }
    });
};

module.exports = { db, initializeDatabase };