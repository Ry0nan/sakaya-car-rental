const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if user exists
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (user) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                [name, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    const token = jwt.sign(
                        { id: this.lastID, email, isAdmin: false },
                        process.env.JWT_SECRET,
                        { expiresIn: '7d' }
                    );

                    res.json({
                        token,
                        user: { id: this.lastID, name, email, isAdmin: false }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
            if (!user) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, isAdmin: user.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    isAdmin: user.isAdmin
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
    db.get("SELECT id, name, email, isAdmin FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    });
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    const { name, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        db.get("SELECT * FROM users WHERE id = ?", [userId], async (err, user) => {
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            let updateQuery = "UPDATE users SET name = ?";
            let params = [name];

            if (currentPassword && newPassword) {
                const validPassword = await bcrypt.compare(currentPassword, user.password);
                if (!validPassword) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                updateQuery += ", password = ?";
                params.push(hashedPassword);
            }

            updateQuery += " WHERE id = ?";
            params.push(userId);

            db.run(updateQuery, params, (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update profile' });
                }
                res.json({ message: 'Profile updated successfully' });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;