require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing admin
        await Admin.deleteMany({ email: 'admin@bussevakolkata.site' });
        console.log('Deleted existing admin user');

        const adminData = {
            name: 'Admin',
            email: 'admin@bussevakolkata.site',
            password: '572486'
        };

        const admin = new Admin(adminData);
        await admin.save();
        console.log('Admin user created successfully!');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin(); 
