import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  startRecording, 
  stopRecording, 
  uploadAudio, 
  processAudio,
  markResponseAsRead 
} from '../../services/audioService';
import { 
  getCurrentLocation, 
  formatLocation,
  getGoogleMapsUrl 
} from '../../services/locationService';
import { 
  getUserMessageHistory,
  MessageWithResponse,
  Response
} from '../../services/messageService';
import { db } from '../../firebase/config';
import { MessageHistoryItem } from './MessageHistoryItem';
import Notifications from './Notifications';
import MessageStats from './MessageStats';
import { collection, getDocs, where, query } from 'firebase/firestore';

const UserDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [messagesWithResponses, setMessagesWithResponses] = useState<MessageWithResponse[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [hasNewResponses, setHasNewResponses] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ messagesCount: number, responsesCount: number }>({ messagesCount: 0, responsesCount: 0 });
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  const timerRef = useRef<number | null>(null);

  // Start timer for recording duration
  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle start recording
  const handleStartRecording = async () => {
    try {
      // Get user's location
      try {
        const userLocation = await getCurrentLocation();
        setLocation(userLocation);
        setLocationError('');
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Unable to get your location. Please enable location services.');
      }
      
      const recorder = await startRecording();
      setMediaRecorder(recorder);
      setRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Handle stop recording
  const handleStopRecording = async () => {
    if (!mediaRecorder) return;
    
    try {
      setRecording(false);
      stopTimer();
      
      const audioBlob = await stopRecording(mediaRecorder);
      
      // Upload audio with location
      await handleUploadAudio(audioBlob);
    } catch (error) {
      console.error('Error stopping recording:', error);
    } finally {
      setMediaRecorder(null);
    }
  };

  // Upload recorded audio to Firebase
  const handleUploadAudio = async (audioBlob: Blob) => {
    if (!currentUser) return;
    
    try {
      setIsUploading(true);
      
      // Upload audio file with location
      const { audioUrl, messageId } = await uploadAudio(audioBlob, currentUser.uid, location);
      console.log("Audio uploaded successfully with ID:", messageId);
      
      // Process audio (transcription & translation)
      await processAudio(audioUrl, messageId);
      console.log("Audio processed successfully");
      
      // Force refresh message list
      fetchDebugData();
    } catch (error) {
      console.error('Error uploading audio:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Directly fetch message and response data for debugging
  const fetchDebugData = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingMessages(true);
      
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(messagesRef, where('userId', '==', currentUser.uid));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const responsesRef = collection(db, 'responses');
      const responsesQuery = query(responsesRef, where('userId', '==', currentUser.uid));
      const responsesSnapshot = await getDocs(responsesQuery);
      
      console.log(`Debug - Direct Firestore Check: Found ${messagesSnapshot.size} messages and ${responsesSnapshot.size} responses`);
      
      setDebugInfo({
        messagesCount: messagesSnapshot.size,
        responsesCount: responsesSnapshot.size
      });
      
      // Extract message data with proper timestamp handling
      const messageData: MessageWithResponse[] = messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          status: data.status,
          transcriptionText: data.transcriptionText || null,
          translatedText: data.translatedText || null,
          audioUrl: data.audioUrl || null,
          location: data.location || null,
          sentAt: data.sentAt?.toDate() || new Date(),
          lastResponseAt: data.lastResponseAt?.toDate() || null,
          responses: [] // Will be populated later
        };
      });
      
      // Extract response data with proper timestamp handling
      const responseData: Response[] = responsesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          messageId: data.messageId,
          userId: data.userId,
          agentId: data.agentId,
          responseText: data.responseText,
          audioUrl: data.audioUrl,
          sentAt: data.sentAt?.toDate() || new Date(),
          isRead: data.isRead || false
        };
      });
      
      // Manually combine messages with their responses
      const combinedData = messageData.map(message => {
        const messageResponses = responseData
          .filter(response => response.messageId === message.id)
          .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
        
        return {
          ...message,
          responses: messageResponses
        };
      });
      
      // Sort by date - newest first
      const sortedData = combinedData.sort((a, b) => 
        b.sentAt.getTime() - a.sentAt.getTime()
      );
      
      // Only update the state if we actually found data
      if (sortedData.length > 0) {
        setMessagesWithResponses(sortedData);
        setLoadingMessages(false);
        
        // Check for unread responses
        const hasUnread = sortedData.some(message => 
          message.responses.some(response => !response.isRead)
        );
        
        setHasNewResponses(hasUnread);
      }
      
      // Even if no data was found, we should stop showing loading
      if (sortedData.length === 0 && messagesSnapshot.size === 0) {
        setLoadingMessages(false);
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
      setLoadingMessages(false);
    }
  };

  // View message details
  const handleViewMessage = (messageId: string) => {
    setSelectedMessage(messageId);
    
    // Mark responses as read when message is viewed
    const message = messagesWithResponses.find(m => m.id === messageId);
    if (message) {
      message.responses.forEach(async (response) => {
        if (!response.isRead) {
          await markResponseAsRead(response.id);
        }
      });
      
      handleResponseRead();
    }
  };

  // Force refresh data
  const handleForceRefresh = () => {
    if (currentUser) {
      fetchDebugData();
      console.log("Force refreshing message data...");
    }
  };

  // Get user's messages and responses
  useEffect(() => {
    if (!currentUser) return;
    
    setLoadingMessages(true);
    console.log("Setting up listeners for user:", currentUser.uid);
    
    // First, fetch debug data directly to ensure we have immediate data
    fetchDebugData();
    
    // Then set up the real-time listener
    const unsubscribe = getUserMessageHistory(currentUser.uid, (history) => {
      console.log("Message history updated:", history.length, "messages received");
      
      // Only update if we received data from the listener
      if (history.length > 0) {
        // Sort messages by date - newest first
        const sortedHistory = [...history].sort((a, b) => 
          b.sentAt.getTime() - a.sentAt.getTime()
        );
        
        // Log response counts for debugging
        let responseCount = 0;
        sortedHistory.forEach(msg => {
          responseCount += msg.responses.length;
          if (msg.responses.length > 0) {
            console.log(`Message ${msg.id} has ${msg.responses.length} responses`);
          }
        });
        
        console.log(`Total of ${responseCount} responses across all messages`);
        
        setMessagesWithResponses(sortedHistory);
        setLoadingMessages(false);
        
        // Check if there are any unread responses
        const hasUnread = sortedHistory.some(message => 
          message.responses.some(response => !response.isRead)
        );
        
        setHasNewResponses(hasUnread);
      }
    });
    
    return () => {
      console.log("Cleaning up message history listener");
      unsubscribe();
    };
  }, [currentUser]);

  // Determine message status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Handle responses being read
  const handleResponseRead = () => {
    // Update the hasNewResponses flag by checking all messages again
    const stillHasUnread = messagesWithResponses.some(message => 
      message.responses.some(response => !response.isRead)
    );
    
    setHasNewResponses(stillHasUnread);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Women Safety System</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              {currentUser?.displayName || currentUser?.email}
            </div>
            <button
              onClick={handleLogout}
              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Emergency Audio Recording</h2>
          
          {locationError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <span className="block sm:inline">{locationError}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Record audio in emergency situations. The audio will be sent to our helpline agents 
              along with your current location.
            </p>
            
            {location && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Your location: </span>
                <a 
                  href={getGoogleMapsUrl(location)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {formatLocation(location)}
                </a>
              </div>
            )}
            
            {recording && (
              <div className="text-red-600 font-semibold animate-pulse mb-2">
                Recording: {formatTime(recordingTime)}
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            {!recording ? (
              <button
                onClick={handleStartRecording}
                disabled={isUploading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a2 2 0 00-2 2v6a2 2 0 104 0V4a2 2 0 00-2-2zm1 10H9a3 3 0 00-3 3v1h7v-1a3 3 0 00-3-3z" />
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Start Recording
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Recording
              </button>
            )}
          </div>
          
          {isUploading && (
            <div className="text-center mt-4 text-gray-600">
              Uploading and processing your audio...
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Message History</h2>
            <div className="flex items-center space-x-2">
              {hasNewResponses && (
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  New Responses
                </span>
              )}
              <button 
                onClick={handleForceRefresh}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
              >
                Refresh Data
              </button>
            </div>
          </div>
          
          {/* Show notifications about message updates */}
          <Notifications 
            messages={messagesWithResponses} 
            onViewMessage={handleViewMessage} 
          />
          
          {/* Display troubleshooting information */}
          {debugInfo.messagesCount > 0 && messagesWithResponses.length === 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Loading Your Messages
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    We found {debugInfo.messagesCount} message(s) and {debugInfo.responsesCount} response(s) in the database.
                    Please wait while we load them, or click the "Refresh Data" button if they don't appear.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {loadingMessages ? (
            <div className="flex flex-col justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-600">Loading your messages...</p>
              <p className="text-sm text-gray-500 mt-2">
                {debugInfo.messagesCount > 0 ? 
                  `Found ${debugInfo.messagesCount} message(s) and ${debugInfo.responsesCount} response(s). Preparing display...` : 
                  "Checking for messages..."}
              </p>
            </div>
          ) : messagesWithResponses.length === 0 ? (
            <div>
              <p className="text-gray-600 text-center py-6">
                {debugInfo.messagesCount > 0 ? 
                  "We're loading your messages. Please wait a moment or try the Refresh Data button." : 
                  "You haven't sent any messages yet."}
              </p>
              
              {debugInfo.messagesCount > 0 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Our system shows that you have {debugInfo.messagesCount} message(s) and {debugInfo.responsesCount} response(s).
                    We're working on displaying them correctly.
                  </p>
                  <button 
                    onClick={handleForceRefresh}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Show message statistics */}
              <MessageStats messages={messagesWithResponses} />
              
              <div className="mb-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-medium text-gray-700">Recent Messages</h3>
                  <div className="flex space-x-2 text-xs">
                    <span className="flex items-center">
                      <span className="w-2 h-2 inline-block rounded-full bg-green-500 mr-1"></span>
                      Responded
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 inline-block rounded-full bg-purple-500 mr-1"></span>
                      Awaiting
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 inline-block rounded-full bg-blue-500 mr-1"></span>
                      Processing
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {messagesWithResponses.map((message) => (
                  <MessageHistoryItem
                    key={message.id}
                    message={message}
                    onResponseRead={handleResponseRead}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard; 