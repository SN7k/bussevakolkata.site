# BusSevaKolkata Backend

This is the backend API for the BusSevaKolkata website, built with Node.js, Express, and MongoDB.

## Features

- Admin authentication with JWT
- Bus management (CRUD operations)
- Image upload functionality
- MongoDB database integration
- RESTful API endpoints

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Render account (for deployment)

## Setup Instructions

1. Clone the repository:
```bash
git clone <your-repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Create an `uploads` directory for storing bus images:
```bash
mkdir uploads
```

5. Start the development server:
```bash
npm run dev
```

## MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is sufficient)
3. Set up database access:
   - Create a database user
   - Set up network access (allow access from anywhere for development)
4. Get your connection string and replace it in the `.env` file

## Deployment to Render

1. Push your code to GitHub

2. Go to [Render](https://render.com) and create a new account

3. Create a new Web Service:
   - Connect your GitHub repository
   - Set the following:
     - Name: bussevakolkata-backend
     - Environment: Node
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Add environment variables from your `.env` file

4. Deploy the service

## API Endpoints

### Authentication
- POST `/api/admin/login` - Admin login
- POST `/api/admin/create-admin` - Create new admin (protected)

### Buses
- GET `/api/buses` - Get all buses
- GET `/api/buses/:id` - Get single bus
- POST `/api/buses` - Create new bus (protected)
- PUT `/api/buses/:id` - Update bus (protected)
- DELETE `/api/buses/:id` - Delete bus (protected)

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes
- File upload validation
- CORS enabled

## Error Handling

The API includes comprehensive error handling for:
- Authentication errors
- Database errors
- File upload errors
- Validation errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 