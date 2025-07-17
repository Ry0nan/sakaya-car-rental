const express = require('express');
const database = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user's cart
router.get('/cart', authenticateToken, async (req, res) => {
    try {
        const db = database.db.get();
        const [items] = await db.execute(
            `SELECT c.*, cars.name, cars.price, cars.image, cars.category 
             FROM cart c 
             JOIN cars ON c.carId = cars.id 
             WHERE c.userId = ?`,
            [req.user.id]
        );
        res.json(items);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart', details: error.message });
    }
});

// Add to cart
router.post('/cart', authenticateToken, async (req, res) => {
    const { carId, startDate, endDate } = req.body;
    const userId = req.user.id;

    try {
        const db = database.db.get();
        // Check if car is available for these dates
        const [conflicts] = await db.execute(
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

        if (conflicts.length > 0) {
            return res.status(400).json({ error: 'Car not available for selected dates' });
        }

        // Check if already in cart
        const [existing] = await db.execute(
            "SELECT * FROM cart WHERE userId = ? AND carId = ? AND startDate = ? AND endDate = ?",
            [userId, carId, startDate, endDate]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already in cart' });
        }

        const [result] = await db.execute(
            "INSERT INTO cart (userId, carId, startDate, endDate) VALUES (?, ?, ?, ?)",
            [userId, carId, startDate, endDate]
        );

        res.json({ id: result.insertId, message: 'Added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add to cart', details: error.message });
    }
});

// Remove from cart
router.delete('/cart/:id', authenticateToken, async (req, res) => {
    try {
        const db = database.db.get();
        await db.execute(
            "DELETE FROM cart WHERE id = ? AND userId = ?",
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Failed to remove from cart', details: error.message });
    }
});

// Checkout
router.post('/checkout', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    
    try {
        const db = database.db.get();
        // Get cart items
        const [cartItems] = await db.execute(
            `SELECT c.*, cars.price 
             FROM cart c 
             JOIN cars ON c.carId = cars.id 
             WHERE c.userId = ?`,
            [userId]
        );

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const rentalIds = [];

        for (const item of cartItems) {
            const days = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
            const totalPrice = days * item.price;

            const [result] = await db.execute(
                `INSERT INTO rentals (userId, carId, startDate, endDate, totalPrice, status) 
                 VALUES (?, ?, ?, ?, ?, 'confirmed')`,
                [userId, item.carId, item.startDate, item.endDate, totalPrice]
            );

            rentalIds.push(result.insertId);
        }

        // Clear cart
        await db.execute("DELETE FROM cart WHERE userId = ?", [userId]);

        res.json({ message: 'Checkout successful', rentalIds });

    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ error: 'Checkout failed', details: error.message });
    }
});

// Get user's rentals
router.get('/my-rentals', authenticateToken, async (req, res) => {
    try {
        const db = database.db.get();
        const [rentals] = await db.execute(
            `SELECT r.*, cars.name, cars.image, cars.category 
             FROM rentals r 
             JOIN cars ON r.carId = cars.id 
             WHERE r.userId = ? 
             ORDER BY r.createdAt DESC`,
            [req.user.id]
        );
        res.json(rentals);
    } catch (error) {
        console.error('Error fetching user rentals:', error);
        res.status(500).json({ error: 'Failed to fetch rentals', details: error.message });
    }
});

// Get all rentals (Admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const db = database.db.get();
        const [rentals] = await db.execute(
            `SELECT r.*, cars.name as carName, users.name as userName, users.email 
             FROM rentals r 
             JOIN cars ON r.carId = cars.id 
             JOIN users ON r.userId = users.id 
             ORDER BY r.createdAt DESC`
        );
        res.json(rentals);
    } catch (error) {
        console.error('Error fetching all rentals:', error);
        res.status(500).json({ error: 'Failed to fetch rentals', details: error.message });
    }
});

// Update rental status (Admin only)
router.put('/:id/status', authenticateToken, isAdmin, async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const db = database.db.get();
        await db.execute(
            "UPDATE rentals SET status = ? WHERE id = ?",
            [status, req.params.id]
        );
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating rental status:', error);
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
});

// Cancel rental
router.post('/:id/cancel', authenticateToken, async (req, res) => {
    const rentalId = req.params.id;
    const userId = req.user.id;

    try {
        const db = database.db.get();
        const [rentals] = await db.execute(
            "SELECT * FROM rentals WHERE id = ? AND userId = ?",
            [rentalId, userId]
        );

        if (rentals.length === 0) {
            return res.status(404).json({ error: 'Rental not found' });
        }

        const rental = rentals[0];
        if (rental.status !== 'pending' && rental.status !== 'confirmed') {
            return res.status(400).json({ error: 'Cannot cancel this rental' });
        }

        await db.execute(
            "UPDATE rentals SET status = 'cancelled' WHERE id = ?",
            [rentalId]
        );

        res.json({ message: 'Rental cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling rental:', error);
        res.status(500).json({ error: 'Failed to cancel rental', details: error.message });
    }
});

module.exports = router;