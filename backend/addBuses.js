require('dotenv').config();
const mongoose = require('mongoose');
const Bus = require('./models/Bus');

const buses = [
    {
        name: "L238",
        route: "Champadali Bus Stand - Howrah Station",
        stops: [
            "Champadali Bus Stand",
            "Howrah Station"
        ],
        imageUrl: "/uploads/default-bus.jpg",
        status: "active",
        schedule: "Every 15-20 minutes",
        fare: "₹10-₹30",
        totalStops: "14 stops"
    },
    {
        name: "DN-9/1",
        route: "Rajchandrapur - Champadali Bus Stand",
        stops: [
            "Rajchandrapur",
            "Champadali Bus Stand"
        ],
        imageUrl: "/uploads/default-bus.jpg",
        status: "active",
        schedule: "Every 20-25 minutes",
        fare: "₹10-₹35",
        totalStops: "16 stops"
    },
    {
        name: "44A",
        route: "Howrah Station - Saltlake",
        stops: [
            "Howrah Station",
            "Saltlake"
        ],
        imageUrl: "/uploads/default-bus.jpg",
        status: "active",
        schedule: "Every 10-15 minutes",
        fare: "₹10-₹25",
        totalStops: "8 stops"
    },
    {
        name: "S12",
        route: "Howrah Station - Santragachi",
        stops: [
            "Howrah Station",
            "Santragachi"
        ],
        imageUrl: "/uploads/default-bus.jpg",
        status: "active",
        schedule: "Every 15-20 minutes",
        fare: "₹10-₹20",
        totalStops: "10 stops"
    }
];

const addBuses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing buses
        await Bus.deleteMany({});
        console.log('Cleared existing buses');

        // Add new buses
        const addedBuses = await Bus.insertMany(buses);
        console.log('Added buses successfully:', addedBuses.length);
        
        process.exit(0);
    } catch (error) {
        console.error('Error adding buses:', error.message);
        process.exit(1);
    }
};

addBuses(); 