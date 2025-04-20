const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
}

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running correctly!',
    environment: {
      bhashiniApiKey: process.env.REACT_APP_BHASHINI_API_KEY ? 'Available' : 'Not available',
      firebaseConfigAvailable: !!process.env.REACT_APP_FIREBASE_API_KEY
    }
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Try accessing: http://localhost:5001/api/test');
}); 