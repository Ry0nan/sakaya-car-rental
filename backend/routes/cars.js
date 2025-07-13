const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all cars
router.get('/', (req, res) => {
    const { category, available } = req.query;
    let query = "SELECT * FROM cars WHERE 1=1";
    const params = [];

    if (category) {
        query += " AND category = ?";
        params.push(category);
    }

    if (available === 'true') {
        query += " AND isAvailable = 1";
    }

    db.all(query, params, (err, cars) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch cars' });
        }
        res.json(cars);
    });
});

// Get single car
router.get('/:id', (req, res) => {
    db.get("SELECT * FROM cars WHERE id = ?", [req.params.id], (err, car) => {
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        res.json(car);
    });
});

// Add new car (Admin only)
router.post('/', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
    const { name, category, price, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '/assets/default-car.jpg';

    db.run(
        "INSERT INTO cars (name, category, price, image, description) VALUES (?, ?, ?, ?, ?)",
        [name, category, price, image, description],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to add car' });
            }
            res.json({
                id: this.lastID,
                name,
                category,
                price,
                image,
                description,
                isAvailable: true
            });
        }
    );
});

// Update car (Admin only)
router.put('/:id', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
    const { name, category, price, description, isAvailable } = req.body;
    const carId = req.params.id;

    db.get("SELECT * FROM cars WHERE id = ?", [carId], (err, car) => {
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }

        const image = req.file ? `/uploads/${req.file.filename}` : car.image;

        db.run(
            "UPDATE cars SET name = ?, category = ?, price = ?, image = ?, description = ?, isAvailable = ? WHERE id = ?",
            [name, category, price, image, description, isAvailable === 'true' ? 1 : 0, carId],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update car' });
                }
                res.json({ message: 'Car updated successfully' });
            }
        );
    });
});

// Delete car (Admin only)
router.delete('/:id', authenticateToken, isAdmin, (req, res) => {
    const carId = req.params.id;

    // Check if car has active rentals
    db.get(
        "SELECT COUNT(*) as count FROM rentals WHERE carId = ? AND status IN ('pending', 'active')",
        [carId],
        (err, result) => {
            if (result.count > 0) {
                return res.status(400).json({ error: 'Cannot delete car with active rentals' });
            }

            db.run("DELETE FROM cars WHERE id = ?", [carId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to delete car' });
                }
                res.json({ message: 'Car deleted successfully' });
            });
        }
    );
});

// Check car availability
router.get('/:id/availability', (req, res) => {
    const { startDate, endDate } = req.query;
    const carId = req.params.id;

    db.all(
        `SELECT * FROM rentals 
         WHERE carId = ? 
         AND status IN ('pending', 'active', 'confirmed')
         AND (
             (startDate <= ? AND endDate >= ?) OR
             (startDate <= ? AND endDate >= ?) OR
             (startDate >= ? AND endDate <= ?)
         )`,
        [carId, startDate, startDate, endDate, endDate, startDate, endDate],
        (err, rentals) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to check availability' });
            }
            res.json({ available: rentals.length === 0, conflicts: rentals });
        }
    );
});

module.exports = router;