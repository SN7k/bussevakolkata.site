# 🚌 BusSevaKolkata [🌐 Live Site](https://bussevakolkata.site)

<p align="center">
  <img src="https://github.com/user-attachments/assets/399ff6ce-660a-42f9-a7ef-9eb845d3d3e5" width="800" alt="BusSevaKolkata Preview" />
</p>

---

## 📌 Overview

**BusSevaKolkata** is a comprehensive transit platform designed to simplify commuting in Kolkata. It provides users with easy access to detailed information about city bus services, routes, schedules, and real-time information. The platform features both a user-friendly frontend interface and a robust backend API for managing bus data.

---

## 🌟 Features

### For Users
- 🚌 **Bus Route Search**: Search for buses by destination with voice input support
- 📍 **Route Details**: View complete route information including stops, schedules, and fares
- 📷 **Bus Images**: Visual identification of buses with high-quality images
- ⭐ **Saved Routes**: Save and quickly access frequently used routes
- 🌙 **Dark/Light Theme**: Toggle between themes for comfortable viewing
- 📱 **Responsive Design**: Mobile-friendly interface for on-the-go access
- 🎯 **Voice Search**: Use voice commands to search for destinations

### For Administrators
- 🔐 **Secure Authentication**: JWT-based admin authentication system
- 📊 **Bus Management**: Add, update, and manage bus information
- 🖼️ **Image Upload**: Cloudinary integration for bus image management
- 📈 **Data Analytics**: Monitor bus data and user interactions

---

## 🛠 Tech Stack

### Frontend
- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with responsive design
- **JavaScript (ES6+)**: Interactive functionality and API integration
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Typography (Poppins)

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: Authentication and authorization
- **bcryptjs**: Password hashing
- **Multer**: File upload handling
- **Cloudinary**: Cloud image storage and management
- **CORS**: Cross-origin resource sharing

### Development Tools
- **Nodemon**: Development server with auto-restart
- **dotenv**: Environment variable management

---

## 📁 Project Structure

```
bussevakolkata.site/
├── backend/                 # Backend API server
│   ├── config/
│   │   └── cloudinary.js    # Cloudinary configuration
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   ├── Admin.js         # Admin user model
│   │   └── Bus.js           # Bus data model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   └── buses.js         # Bus management routes
│   ├── addBuses.js          # Bus data seeding script
│   ├── createAdmin.js       # Admin user creation script
│   ├── package.json         # Backend dependencies
│   └── server.js            # Main server file
├── mainsite/                # Frontend application
│   ├── images/
│   │   └── favicon.ico      # Site favicon
│   ├── js/
│   │   └── config.js        # Frontend configuration
│   ├── about.html           # About page
│   ├── bus-card.css         # Bus card styling
│   ├── bus-list.html        # Bus routes listing page
│   ├── bus-list.js          # Bus listing functionality
│   ├── data.json            # Static bus data
│   ├── index.html           # Main homepage
│   ├── nav-scroll.js        # Navigation scroll effects
│   ├── saved-routes.html    # Saved routes page
│   ├── saved-routes.js      # Saved routes functionality
│   ├── script.js            # Main frontend script
│   ├── styles.css           # Main stylesheet
│   └── theme.js             # Theme toggle functionality
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 14.0.0)
- MongoDB Atlas account
- Cloudinary account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/bussevakolkata.git
   cd bussevakolkata
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   # Create admin user
   node createAdmin.js
   
   # Add sample bus data (optional)
   node addBuses.js
   ```

5. **Start the Backend Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Frontend Setup**
   ```bash
   cd ../mainsite
   # Open index.html in your browser or serve with a local server
   ```

### Running the Application

- **Backend API**: `http://localhost:5000`
- **Frontend**: Open `mainsite/index.html` in your browser
- **API Documentation**: Available at `http://localhost:5000/api`

---

## 🔧 API Endpoints

### Authentication
- `POST /api/admin/register` - Register new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile (protected)

### Bus Management
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get specific bus
- `POST /api/buses` - Add new bus (protected)
- `PUT /api/buses/:id` - Update bus (protected)
- `DELETE /api/buses/:id` - Delete bus (protected)

---

## 🎨 Features in Detail

### Search Functionality
- Real-time search with debouncing
- Voice input support using Web Speech API
- Fuzzy matching for better results
- Search history and suggestions

### Route Management
- Complete route information display
- Interactive bus cards with images
- Save/unsave routes functionality
- Local storage for offline access

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive navigation menu
- Optimized for all screen sizes

---

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API endpoints
- CORS configuration
- Input validation and sanitization

---

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Configure MongoDB Atlas connection
3. Set up Cloudinary credentials
4. Deploy to platforms like Render, Heroku, or Railway

### Frontend Deployment
1. Build and optimize static files
2. Deploy to Netlify, Vercel, or GitHub Pages
3. Configure CORS settings for API communication

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Website**: [https://bussevakolkata.site](https://bussevakolkata.site)
- **Email**: support@bussevakolkata.site
- **Issues**: [GitHub Issues](https://github.com/your-username/bussevakolkata/issues)

---

## 🙏 Acknowledgments

- Kolkata Transport Department for route information
- Open source community for libraries and tools
- Contributors and beta testers

---

<p align="center">
  Made with ❤️ for Kolkata commuters
</p>
