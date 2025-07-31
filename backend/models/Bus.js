const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    route: {
        type: String,
        required: true,
        trim: true
    },
    stops: [{
        type: String,
        trim: true
    }],
    imageUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    schedule: {
        type: String,
        required: true,
        trim: true
    },
    fare: {
        type: String,
        required: true,
        trim: true
    },
    totalStops: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Bus = mongoose.model('Bus', busSchema);
module.exports = Bus; 
