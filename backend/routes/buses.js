const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Bus = require('../models/Bus');
const auth = require('../middleware/auth');
const NodeCache = require('node-cache');
const { storage, cloudinary } = require('../config/cloudinary');
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Configure multer for file upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

// Get all buses with caching
router.get('/', async (req, res) => {
    try {
        // Check cache first
        const cachedBuses = cache.get('allBuses');
        if (cachedBuses) {
            return res.json(cachedBuses);
        }

        const buses = await Bus.find();
        // Store in cache
        cache.set('allBuses', buses);
        res.json(buses);
    } catch (error) {
        console.error('Error fetching buses:', error);
        res.status(500).json({ message: 'Error fetching buses' });
    }
});

// Get single bus with caching
router.get('/:id', async (req, res) => {
    try {
        // Check cache first
        const cachedBus = cache.get(`bus_${req.params.id}`);
        if (cachedBus) {
            return res.json(cachedBus);
        }

        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Store in cache
        cache.set(`bus_${req.params.id}`, bus);
        res.json(bus);
    } catch (error) {
        console.error('Error fetching bus:', error);
        res.status(500).json({ message: 'Error fetching bus' });
    }
});

// Create new bus (protected)
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, route, stops, schedule, fare, totalStops } = req.body;
        
        // Handle image upload
        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary returns the URL in the path property
        }

        const bus = new Bus({
            name,
            route,
            stops: stops ? stops.split(',').map(stop => stop.trim()) : [],
            imageUrl: imageUrl || 'https://res.cloudinary.com/dlpskz98w/image/upload/v1/bussevakolkata/default-bus.jpg', // Use default image if none uploaded
            schedule,
            fare,
            totalStops: totalStops || (stops ? stops.split(',').length.toString() : '0')
        });

        await bus.save();
        res.status(201).json(bus);
    } catch (error) {
        console.error('Error creating bus:', error);
        res.status(500).json({ message: 'Error creating bus', error: error.message });
    }
});

// Update bus (protected)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, route, stops, schedule, fare } = req.body;
        const updateData = {
            name,
            route,
            stops: stops ? stops.split(',').map(stop => stop.trim()) : [],
            schedule,
            fare
        };

        // Handle image upload
        if (req.file) {
            updateData.imageUrl = req.file.path; // Cloudinary returns the URL in the path property
            
            // Delete old image from Cloudinary if it exists and is not the default image
            const oldBus = await Bus.findById(req.params.id);
            if (oldBus && oldBus.imageUrl && !oldBus.imageUrl.includes('default-bus.jpg')) {
                try {
                    // Extract public_id from the Cloudinary URL
                    const publicId = oldBus.imageUrl.split('/').slice(-1)[0].split('.')[0];
                    await cloudinary.uploader.destroy(`bussevakolkata/${publicId}`);
                } catch (deleteError) {
                    console.error('Error deleting old image from Cloudinary:', deleteError);
                    // Continue with the update even if deletion fails
                }
            }
        }

        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json(bus);
    } catch (error) {
        console.error('Error updating bus:', error);
        res.status(500).json({ message: 'Error updating bus', error: error.message });
    }
});

// Delete bus (protected)
router.delete('/:id', auth, async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Delete associated image from Cloudinary if it exists and is not the default image
        if (bus.imageUrl && !bus.imageUrl.includes('default-bus.jpg')) {
            try {
                // Extract public_id from the Cloudinary URL
                const publicId = bus.imageUrl.split('/').slice(-1)[0].split('.')[0];
                await cloudinary.uploader.destroy(`bussevakolkata/${publicId}`);
            } catch (deleteError) {
                console.error('Error deleting image from Cloudinary:', deleteError);
                // Continue with bus deletion even if image deletion fails
            }
        }

        await Bus.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bus deleted successfully' });
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).json({ message: 'Error deleting bus', error: error.message });
    }
});

module.exports = router; 
