const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log('Missing credentials');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email });
        console.log('Admin found:', admin ? 'Yes' : 'No');

        if (!admin) {
            console.log('Admin not found');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('Invalid password');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        console.log('Login successful');
        res.json({
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create initial admin (protected route)
router.post('/create-admin', auth, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const admin = new Admin({
            name,
            email,
            password
        });

        await admin.save();

        res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 
