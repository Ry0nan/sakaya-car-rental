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
router.get('/', async (req, res) => {
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

    try {
        const [cars] = await db.execute(query, params);
        res.json(cars);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cars' });
    }
});

// Get single car
router.get('/:id', async (req, res) => {
    try {
        const [cars] = await db.execute("SELECT * FROM cars WHERE id = ?", [req.params.id]);
        if (cars.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        res.json(cars[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch car' });
    }
});

// Add new car (Admin only)
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    const { name, category, price, description, seats, isAvailable } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const [result] = await db.execute(
            "INSERT INTO cars (name, category, price, description, seats, image, isAvailable) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, category, price, description, seats, image, isAvailable || 1]
        );
        res.json({ id: result.insertId, message: 'Car added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add car' });
    }
});

// Update car (Admin only)
router.put('/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    const { name, category, price, description, seats, isAvailable } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
        let query = "UPDATE cars SET name = ?, category = ?, price = ?, description = ?, seats = ?, isAvailable = ?";
        let params = [name, category, price, description, seats, isAvailable];

        if (image) {
            query += ", image = ?";
            params.push(image);
        }

        query += " WHERE id = ?";
        params.push(req.params.id);

        await db.execute(query, params);
        res.json({ message: 'Car updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update car' });
    }
});

// Delete car (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await db.execute("DELETE FROM cars WHERE id = ?", [req.params.id]);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete car' });
    }
});

// Check car availability
router.get('/:id/availability', async (req, res) => {
    const { startDate, endDate } = req.query;
    const carId = req.params.id;

    try {
        const [rentals] = await db.execute(
            `SELECT * FROM rentals 
             WHERE carId = ? 
             AND status IN ('pending', 'active', 'confirmed')
             AND (
                 (startDate <= ? AND endDate >= ?) OR
                 (startDate <= ? AND endDate >= ?) OR
                 (startDate >= ? AND endDate <= ?)
             )`,
            [carId, startDate, startDate, endDate, endDate, startDate, endDate]
        );
        res.json({ available: rentals.length === 0, conflicts: rentals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

module.exports = router;