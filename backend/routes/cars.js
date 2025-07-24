const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { Client } = require('@replit/object-storage');

const router = express.Router();

// Initialize Object Storage client lazily
let client = null;
function getObjectStorageClient() {
    if (!client) {
        try {
            client = new Client();
        } catch (error) {
            console.warn('Object Storage not available, falling back to local storage');
            return null;
        }
    }
    return client;
}

// Configure multer for memory storage (Object Storage)
const storage = multer.memoryStorage();

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
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
        const db = database.db.get();
        const [cars] = await db.execute(query, params);
        console.log(`Fetched ${cars.length} cars from database`);
        res.json(cars);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ error: 'Failed to fetch cars', details: error.message });
    }
});

// Get single car
router.get('/:id', async (req, res) => {
    try {
        const db = database.db.get();
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
    const { name, category, price, description, isAvailable } = req.body;
    let image = '/assets/default-car.jpg';

    try {
        // Upload image to Object Storage if provided
        if (req.file) {
            const objectStorageClient = getObjectStorageClient();
            if (objectStorageClient) {
                try {
                    const filename = `cars/${Date.now()}-${req.file.originalname}`;
                    const result = await objectStorageClient.uploadFromText(filename, req.file.buffer.toString('base64'), {
                        contentType: req.file.mimetype
                    });
                    if (result.ok) {
                        image = `/api/storage/${filename}`;
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    console.warn('Object Storage upload failed, falling back to local storage:', error.message);
                    // Fallback to local file storage
                    const uploadPath = path.join(__dirname, '../uploads');
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }
                    const filename = Date.now() + path.extname(req.file.originalname);
                    const filepath = path.join(uploadPath, filename);
                    fs.writeFileSync(filepath, req.file.buffer);
                    image = `/uploads/${filename}`;
                }
            } else {
                // Fallback to local file storage
                const uploadPath = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                const filename = Date.now() + path.extname(req.file.originalname);
                const filepath = path.join(uploadPath, filename);
                fs.writeFileSync(filepath, req.file.buffer);
                image = `/uploads/${filename}`;
            }
        }

        const db = database.db.get();
        const [result] = await db.execute(
            "INSERT INTO cars (name, category, price, description, image, isAvailable) VALUES (?, ?, ?, ?, ?, ?)",
            [
                name || null,
                category || null,
                price || null,
                description || null,
                image,
                isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true ? 1 : 0) : 1
            ]
        );
        res.json({ id: result.insertId, message: 'Car added successfully' });
    } catch (error) {
        console.error('Error adding car:', error);
        res.status(500).json({ error: 'Failed to add car', details: error.message });
    }
});

// Update car (Admin only)
router.put('/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    const { name, category, price, description, isAvailable } = req.body;
    let image = undefined;

    try {
        // Upload new image to Object Storage if provided
        if (req.file) {
            const objectStorageClient = getObjectStorageClient();
            if (objectStorageClient) {
                try {
                    const filename = `cars/${Date.now()}-${req.file.originalname}`;
                    const result = await objectStorageClient.uploadFromText(filename, req.file.buffer.toString('base64'), {
                        contentType: req.file.mimetype
                    });
                    if (result.ok) {
                        image = `/api/storage/${filename}`;
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    console.warn('Object Storage upload failed, falling back to local storage:', error.message);
                    // Fallback to local file storage
                    const uploadPath = path.join(__dirname, '../uploads');
                    if (!fs.existsSync(uploadPath)) {
                        fs.mkdirSync(uploadPath, { recursive: true });
                    }
                    const filename = Date.now() + path.extname(req.file.originalname);
                    const filepath = path.join(uploadPath, filename);
                    fs.writeFileSync(filepath, req.file.buffer);
                    image = `/uploads/${filename}`;
                }
            } else {
                // Fallback to local file storage
                const uploadPath = path.join(__dirname, '../uploads');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                const filename = Date.now() + path.extname(req.file.originalname);
                const filepath = path.join(uploadPath, filename);
                fs.writeFileSync(filepath, req.file.buffer);
                image = `/uploads/${filename}`;
            }
        }

        const db = database.db.get();
        let query = "UPDATE cars SET name = ?, category = ?, price = ?, description = ?, isAvailable = ?";
        let params = [
            name || null,
            category || null,
            price || null,
            description || null,
            isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true ? 1 : 0) : null
        ];

        if (image) {
            query += ", image = ?";
            params.push(image);
        }

        query += " WHERE id = ?";
        params.push(req.params.id);

        await db.execute(query, params);
        res.json({ message: 'Car updated successfully' });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ error: 'Failed to update car', details: error.message });
    }
});

// Delete car (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const db = database.db.get();
        
        // First delete all cart entries for this car
        await db.execute("DELETE FROM cart WHERE carId = ?", [req.params.id]);
        
        // Then delete all rental entries for this car
        await db.execute("DELETE FROM rentals WHERE carId = ?", [req.params.id]);
        
        // Finally delete the car itself
        await db.execute("DELETE FROM cars WHERE id = ?", [req.params.id]);
        
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ error: 'Failed to delete car', details: error.message });
    }
});

// Check car availability
router.get('/:id/availability', async (req, res) => {
    const { startDate, endDate } = req.query;
    const carId = req.params.id;

    try {
        const db = database.db.get();
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
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability', details: error.message });
    }
});

// Serve images from Object Storage
router.get('/storage/:filename(*)', async (req, res) => {
    try {
        const objectStorageClient = getObjectStorageClient();
        if (!objectStorageClient) {
            return res.status(404).send('Object Storage not available');
        }
        
        const filename = req.params.filename;
        const result = await objectStorageClient.downloadAsText(filename);
        
        if (!result.ok) {
            return res.status(404).send('Image not found');
        }
        
        // Convert base64 back to buffer
        const buffer = Buffer.from(result.value, 'base64');
        
        // Set appropriate content type
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'avif': 'image/avif'
        };
        
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.send(buffer);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(404).send('Image not found');
    }
});

module.exports = router;