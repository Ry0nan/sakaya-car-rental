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
        const [existingUsers] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        const token = jwt.sign(
            { id: result.insertId, email, isAdmin: false },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: result.insertId, name, email, isAdmin: false }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute("SELECT id, name, email, isAdmin FROM users WHERE id = ?", [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    const { name, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
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

        await db.execute(updateQuery, params);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;