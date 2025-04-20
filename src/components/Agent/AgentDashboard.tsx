import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  startRecording, 
  stopRecording, 
  createAgentResponse 
} from '../../services/audioService';
import {
  getAllMessages,
  getMessageResponses,
  getUserInfo,
  Message,
  Response
} from '../../services/messageService';
import {
  formatLocation,
  getGoogleMapsUrl
} from '../../services/locationService';

const AgentDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [responses, setResponses] = useState<{ [messageId: string]: Response[] }>({});
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [userInfo, setUserInfo] = useState<{ [userId: string]: { name: string; email: string } }>({});
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [responseAudio, setResponseAudio] = useState<Blob | null>(null);
  
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
      setResponseAudio(audioBlob);
    } catch (error) {
      console.error('Error stopping recording:', error);
    } finally {
      setMediaRecorder(null);
    }
  };

  // Select message to view details
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setResponseText('');
    setResponseAudio(null);
    
    // Load responses for this message if not already loaded
    if (!responses[message.id]) {
      getMessageResponses(message.id, (resp) => {
        setResponses(prevResponses => ({
          ...prevResponses,
          [message.id]: resp
        }));
      });
    }
  };

  // Send response to user
  const handleSendResponse = async () => {
    if (!currentUser || !selectedMessage) return;
    
    if (!responseText.trim() && !responseAudio) {
      alert('Please provide a text response or record an audio response');
      return;
    }
    
    try {
      setLoading(true);
      
      await createAgentResponse(
        selectedMessage.id, 
        selectedMessage.userId, 
        currentUser.uid, 
        responseText,
        responseAudio || undefined
      );
      
      // Clear form
      setResponseText('');
      setResponseAudio(null);
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Failed to send response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load all messages
  useEffect(() => {
    const unsubscribe = getAllMessages((allMessages) => {
      setMessages(allMessages);
      
      // Fetch user info for all users in the messages
      const userIds = [...new Set(allMessages.map(message => message.userId))];
      
      userIds.forEach(async (userId) => {
        if (!userInfo[userId]) {
          const info = await getUserInfo(userId);
          setUserInfo(prev => ({
            ...prev,
            [userId]: info
          }));
        }
      });
    });
    
    return unsubscribe;
  }, [userInfo]);

  // Get message status element with appropriate color
  const getStatusElement = (status: string) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status) {
      case 'pending':
      case 'sent':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'processed':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'responded':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'error':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }
    
    return (
      <span className={`${bgColor} ${textColor} px-2 py-1 rounded-full text-xs font-medium`}>
        {status}
      </span>
    );
  };

  // Get user name from info, or fallback to email or ID
  const getUserName = (userId: string) => {
    if (userInfo[userId]) {
      return userInfo[userId].name || userInfo[userId].email || userId;
    }
    return userId;
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
          <h1 className="text-2xl font-bold">Helpline Agent Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              {currentUser?.displayName || currentUser?.email} (Agent)
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
      
      <main className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Message List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-4 h-full">
              <h2 className="text-xl font-semibold mb-4">Incoming Messages</h2>
              
              {messages.length === 0 ? (
                <p className="text-gray-600 text-center py-6">
                  No messages yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-purple-100 border-l-4 border-purple-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => handleSelectMessage(message)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">
                          {getUserName(message.userId)}
                        </span>
                        {getStatusElement(message.status)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {message.sentAt.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Message Details */}
          <div className="lg:w-2/3">
            {selectedMessage ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">Message Details</h2>
                  <div>
                    {getStatusElement(selectedMessage.status)}
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">From:</p>
                  <p className="font-medium">{getUserName(selectedMessage.userId)}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Time:</p>
                  <p>{selectedMessage.sentAt.toLocaleString()}</p>
                </div>
                
                {selectedMessage.location && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Location:</p>
                    <a 
                      href={getGoogleMapsUrl(selectedMessage.location)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {formatLocation(selectedMessage.location)} - View on Map
                    </a>
                  </div>
                )}
                
                {selectedMessage.audioUrl && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Audio Message:</p>
                    <audio controls src={selectedMessage.audioUrl} className="w-full" />
                  </div>
                )}
                
                {selectedMessage.transcriptionText && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Original Transcription:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {selectedMessage.transcriptionText}
                    </div>
                  </div>
                )}
                
                {selectedMessage.translatedText && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Translated Text:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {selectedMessage.translatedText}
                    </div>
                  </div>
                )}
                
                {/* Previous Responses */}
                {responses[selectedMessage.id] && responses[selectedMessage.id].length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Previous Responses:</h3>
                    <div className="space-y-3">
                      {responses[selectedMessage.id].map((response) => (
                        <div key={response.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="mb-2">{response.responseText}</p>
                          {response.audioUrl && (
                            <audio controls src={response.audioUrl} className="w-full" />
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Sent at {response.sentAt.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Response Form */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="font-semibold mb-3">Send Response:</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="responseText" className="block text-sm font-medium text-gray-700 mb-1">
                      Response Text
                    </label>
                    <textarea
                      id="responseText"
                      className="w-full border rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={4}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response here..."
                    />
                  </div>
                  
                  <div className="mb-4">
                    <p className="block text-sm font-medium text-gray-700 mb-1">Audio Response (Optional)</p>
                    
                    {recording ? (
                      <div className="flex items-center space-x-2">
                        <div className="text-red-600 animate-pulse">
                          Recording: {formatTime(recordingTime)}
                        </div>
                        <button
                          onClick={handleStopRecording}
                          className="bg-gray-700 hover:bg-gray-800 text-white text-sm py-1 px-3 rounded"
                        >
                          Stop Recording
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleStartRecording}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 px-3 rounded"
                        >
                          Record Audio
                        </button>
                        
                        {responseAudio && (
                          <span className="text-green-600 text-sm">Audio recorded</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleSendResponse}
                    disabled={loading || (!responseText.trim() && !responseAudio)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center h-full">
                <p className="text-gray-500">
                  Select a message to view details and respond
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard; 