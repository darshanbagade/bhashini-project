# Women Safety System

A real-time voice translation and emergency response system for women's safety that allows users to record audio messages that are automatically transcribed, translated, and sent to helpline agents along with the user's location.

## Features

- **User Authentication**: Secure login and account creation
- **Audio Recording**: Record audio messages in emergency situations
- **Real-time Location Sharing**: Automatically send location data with audio messages
- **Audio Transcription & Translation**: Using Bhashini API for multilingual support
- **Agent Dashboard**: Dedicated interface for helpline agents to respond to emergencies
- **Two-way Communication**: Agents can send text and audio responses to users

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Database & Storage**: Firebase (Firestore, Storage, Authentication)
- **Translation API**: Bhashini API for audio transcription and translation
- **Location Services**: Browser Geolocation API

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Bhashini API key

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
REACT_APP_BHASHINI_API_KEY=your_bhashini_api_key
```

### Frontend Setup
1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm start
```

### Backend Setup
1. Navigate to the server directory:
```
cd server
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm run dev
```

### Running the Application

#### Option 1: Using the batch file (Windows)
For Windows users, we've created a simple batch file to start both the frontend and backend servers:

```
start.bat
```

This will open two command windows, one for the frontend and one for the backend.

#### Option 2: Using npm scripts
If you're on Mac/Linux or prefer using npm scripts:

```
npm run dev
```

This will start both the frontend and backend servers using concurrently.

#### Option 3: Running separately
You can also run the frontend and backend servers separately:

1. Start the frontend:
```
npm start
```

2. In a separate terminal, start the backend:
```
cd server
npm run dev
```

## Usage

### User Flow
1. Create an account or log in as a user
2. Record audio messages in emergency situations
3. View responses from helpline agents

### Agent Flow
1. Create an account or log in as an agent
2. View incoming emergency messages with location data
3. Listen to audio and view transcriptions
4. Send text or audio responses to users

## License
MIT
