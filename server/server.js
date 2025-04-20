const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

// Load environment variables
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
}

console.log('Environment variables loaded successfully');
console.log('BHASHINI API KEY available:', !!process.env.REACT_APP_BHASHINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../build')));

// API endpoint for processing audio
app.post('/api/process-audio', async (req, res) => {
  const { base64Audio } = req.body;

  if (!base64Audio) {
    return res.status(400).json({ error: 'No audio data received' });
  }

  const payload = {
    pipelineTasks: [
      {
        taskType: 'asr',
        config: {
          language: { sourceLanguage: 'hi' },
          serviceId: '',
          audioFormat: 'flac',
          samplingRate: 16000
        }
      },
      {
        taskType: 'translation',
        config: {
          language: { sourceLanguage: 'hi', targetLanguage: 'en' },
          serviceId: ''
        }
      },
      {
        taskType: 'tts',
        config: {
          language: { sourceLanguage: 'en' },
          serviceId: '',
          gender: 'female',
          samplingRate: 8000
        }
      }
    ],
    inputData: {
      audio: [{ audioContent: base64Audio }]
    }
  };

  try {
    console.log('Making request to Bhashini API...');
    const response = await axios.post(
      'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
      payload,
      {
        headers: {
          'Accept': '*/*',
          'User-Agent': 'WomenSafetyApp',
          'Authorization': process.env.REACT_APP_BHASHINI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Bhashini API response received');
    res.json(response.data);
  } catch (error) {
    console.error('API Request Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to process audio', details: error.message });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running correctly!' });
});

// Handle any other routes (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}); 