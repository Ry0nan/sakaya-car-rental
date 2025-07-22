
const express = require('express');
const database = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get feedback for a specific car
router.get('/car/:carId', async (req, res) => {
    try {
        const db = database.db.get();
        const [feedback] = await db.execute(
            `SELECT f.*, u.name as userName 
             FROM feedback f 
             JOIN users u ON f.userId = u.id 
             WHERE f.carId = ? 
             ORDER BY f.createdAt DESC`,
            [req.params.carId]
        );
        res.json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback', details: error.message });
    }
});

// Get average rating for a specific car
router.get('/car/:carId/rating', async (req, res) => {
    try {
        const db = database.db.get();
        const [result] = await db.execute(
            `SELECT AVG(rating) as averageRating, COUNT(*) as totalReviews 
             FROM feedback 
             WHERE carId = ?`,
            [req.params.carId]
        );
        res.json({
            averageRating: result[0].averageRating ? parseFloat(result[0].averageRating).toFixed(1) : 0,
            totalReviews: result[0].totalReviews
        });
    } catch (error) {
        console.error('Error fetching rating:', error);
        res.status(500).json({ error: 'Failed to fetch rating', details: error.message });
    }
});

// Add or update feedback (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
    const { carId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!carId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Valid car ID and rating (1-5) are required' });
    }

    try {
        const db = database.db.get();
        
        // Check if user has already left feedback for this car
        const [existing] = await db.execute(
            "SELECT * FROM feedback WHERE userId = ? AND carId = ?",
            [userId, carId]
        );

        if (existing.length > 0) {
            // Update existing feedback
            await db.execute(
                "UPDATE feedback SET rating = ?, comment = ?, createdAt = CURRENT_TIMESTAMP WHERE userId = ? AND carId = ?",
                [rating, comment || null, userId, carId]
            );
            res.json({ message: 'Feedback updated successfully' });
        } else {
            // Insert new feedback
            const [result] = await db.execute(
                "INSERT INTO feedback (userId, carId, rating, comment) VALUES (?, ?, ?, ?)",
                [userId, carId, rating, comment || null]
            );
            res.json({ id: result.insertId, message: 'Feedback added successfully' });
        }
    } catch (error) {
        console.error('Error adding/updating feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback', details: error.message });
    }
});

// Get user's feedback
router.get('/my-feedback', authenticateToken, async (req, res) => {
    try {
        const db = database.db.get();
        const [feedback] = await db.execute(
            `SELECT f.*, c.name as carName, c.image as carImage 
             FROM feedback f 
             JOIN cars c ON f.carId = c.id 
             WHERE f.userId = ? 
             ORDER BY f.createdAt DESC`,
            [req.user.id]
        );
        res.json(feedback);
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ error: 'Failed to fetch user feedback', details: error.message });
    }
});

// Get all feedback (Admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const db = database.db.get();
        const [feedback] = await db.execute(
            `SELECT f.*, u.name as userName, u.email, c.name as carName, c.category as carCategory, c.price as carPrice
             FROM feedback f 
             JOIN users u ON f.userId = u.id 
             JOIN cars c ON f.carId = c.id 
             ORDER BY f.createdAt DESC`
        );
        res.json(feedback);
    } catch (error) {
        console.error('Error fetching all feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback', details: error.message });
    }
});

// Get detailed feedback by ID (Admin only)
router.get('/details/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const db = database.db.get();
        const [feedback] = await db.execute(
            `SELECT f.*, u.name as userName, u.email, u.createdAt as userCreatedAt,
                    c.name as carName, c.category as carCategory, c.price as carPrice, c.description as carDescription
             FROM feedback f 
             JOIN users u ON f.userId = u.id 
             JOIN cars c ON f.carId = c.id 
             WHERE f.id = ?`,
            [req.params.id]
        );
        
        if (feedback.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        
        res.json(feedback[0]);
    } catch (error) {
        console.error('Error fetching feedback details:', error);
        res.status(500).json({ error: 'Failed to fetch feedback details', details: error.message });
    }
});

// Delete feedback (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const db = database.db.get();
        await db.execute("DELETE FROM feedback WHERE id = ?", [req.params.id]);
        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ error: 'Failed to delete feedback', details: error.message });
    }
});

module.exports = router;
