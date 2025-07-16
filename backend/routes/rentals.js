const express = require('express');
const { db } = require('../database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get user's cart
router.get('/cart', authenticateToken, (req, res) => {
    db.all(
        `SELECT c.*, cars.name, cars.price, cars.image, cars.category 
         FROM cart c 
         JOIN cars ON c.carId = cars.id 
         WHERE c.userId = ?`,
        [req.user.id],
        (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch cart' });
            }
            res.json(items);
        }
    );
});

// Add to cart
router.post('/cart', authenticateToken, (req, res) => {
    const { carId, startDate, endDate } = req.body;
    const userId = req.user.id;

    // Check if car is available for these dates
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
        (err, conflicts) => {
            if (conflicts.length > 0) {
                return res.status(400).json({ error: 'Car not available for selected dates' });
            }

            // Check if already in cart
            db.get(
                "SELECT * FROM cart WHERE userId = ? AND carId = ? AND startDate = ? AND endDate = ?",
                [userId, carId, startDate, endDate],
                (err, existing) => {
                    if (existing) {
                        return res.status(400).json({ error: 'Already in cart' });
                    }

                    db.run(
                        "INSERT INTO cart (userId, carId, startDate, endDate) VALUES (?, ?, ?, ?)",
                        [userId, carId, startDate, endDate],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to add to cart' });
                            }
                            res.json({ id: this.lastID, message: 'Added to cart' });
                        }
                    );
                }
            );
        }
    );
});

// Remove from cart
router.delete('/cart/:id', authenticateToken, (req, res) => {
    db.run(
        "DELETE FROM cart WHERE id = ? AND userId = ?",
        [req.params.id, req.user.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to remove from cart' });
            }
            res.json({ message: 'Removed from cart' });
        }
    );
});

// Checkout
router.post('/checkout', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
        `SELECT c.*, cars.price 
         FROM cart c 
         JOIN cars ON c.carId = cars.id 
         WHERE c.userId = ?`,
        [userId],
        (err, cartItems) => {
            if (err || cartItems.length === 0) {
                return res.status(400).json({ error: 'Cart is empty' });
            }

            // Begin transaction
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                let success = true;
                const rentalIds = [];

                cartItems.forEach(item => {
                    const days = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
                    const totalPrice = days * item.price;

                    db.run(
                        `INSERT INTO rentals (userId, carId, startDate, endDate, totalPrice, status) 
                         VALUES (?, ?, ?, ?, ?, 'confirmed')`,
                        [userId, item.carId, item.startDate, item.endDate, totalPrice],
                        function(err) {
                            if (err) {
                                success = false;
                            } else {
                                rentalIds.push(this.lastID);
                            }
                        }
                    );
                });

                if (success) {
                    // Clear cart
                    db.run("DELETE FROM cart WHERE userId = ?", [userId], (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: 'Checkout failed' });
                        }
                        db.run("COMMIT");
                        res.json({ message: 'Checkout successful', rentalIds });
                    });
                } else {
                    db.run("ROLLBACK");
                    res.status(500).json({ error: 'Checkout failed' });
                }
            });
        }
    );
});

// Get user's rentals
router.get('/my-rentals', authenticateToken, (req, res) => {
    db.all(
        `SELECT r.*, cars.name, cars.image, cars.category 
         FROM rentals r 
         JOIN cars ON r.carId = cars.id 
         WHERE r.userId = ? 
         ORDER BY r.createdAt DESC`,
        [req.user.id],
        (err, rentals) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch rentals' });
            }
            res.json(rentals);
        }
    );
});

// Get all rentals (Admin only)
router.get('/all', authenticateToken, isAdmin, (req, res) => {
    db.all(
        `SELECT r.*, cars.name as carName, users.name as userName, users.email 
         FROM rentals r 
         JOIN cars ON r.carId = cars.id 
         JOIN users ON r.userId = users.id 
         ORDER BY r.createdAt DESC`,
        (err, rentals) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch rentals' });
            }
            res.json(rentals);
        }
    );
});

// Update rental status (Admin only)
router.put('/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run(
        "UPDATE rentals SET status = ? WHERE id = ?",
        [status, req.params.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update status' });
            }
            res.json({ message: 'Status updated successfully' });
        }
    );
});

// Cancel rental
router.post('/:id/cancel', authenticateToken, (req, res) => {
    const rentalId = req.params.id;
    const userId = req.user.id;

    db.get(
        "SELECT * FROM rentals WHERE id = ? AND userId = ?",
        [rentalId, userId],
        (err, rental) => {
            if (!rental) {
                return res.status(404).json({ error: 'Rental not found' });
            }

            if (rental.status !== 'pending' && rental.status !== 'confirmed') {
                return res.status(400).json({ error: 'Cannot cancel this rental' });
            }

            db.run(
                "UPDATE rentals SET status = 'cancelled' WHERE id = ?",
                [rentalId],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to cancel rental' });
                    }
                    res.json({ message: 'Rental cancelled successfully' });
                }
            );
        }
    );
});

module.exports = router;