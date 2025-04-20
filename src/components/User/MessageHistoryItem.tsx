import React, { useState } from 'react';
import { MessageWithResponse } from '../../services/messageService';
import { markResponseAsRead } from '../../services/messageService';
import { formatDistanceToNow, format } from 'date-fns';

interface MessageHistoryItemProps {
  message: MessageWithResponse;
  onResponseRead: () => void;
}

export const MessageHistoryItem: React.FC<MessageHistoryItemProps> = ({ message, onResponseRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine if there are any unread responses
  const hasUnreadResponses = message.responses.some(response => !response.isRead);
  
  // Format the message's date for display
  const formattedDate = formatDistanceToNow(message.sentAt, { addSuffix: true });
  
  // Last response date and time
  const lastResponseDate = message.lastResponseAt 
    ? format(message.lastResponseAt, 'MMM dd, yyyy') 
    : null;
  
  const lastResponseTime = message.lastResponseAt 
    ? format(message.lastResponseAt, 'h:mm a') 
    : null;
  
  // Number of responses
  const responseCount = message.responses.length;
  
  // Handle toggling the message open/closed
  const handleToggle = async () => {
    setIsOpen(!isOpen);
    
    // If opening the message and there are unread responses, mark them as read
    if (!isOpen && hasUnreadResponses) {
      const unreadResponses = message.responses.filter(response => !response.isRead);
      
      for (const response of unreadResponses) {
        await markResponseAsRead(response.id);
      }
      
      // Notify parent component that responses were read
      onResponseRead();
    }
  };
  
  // Get message display text
  const getMessageDisplayText = () => {
    if (message.translatedText) return message.translatedText;
    if (message.transcriptionText) return message.transcriptionText;
    return "Audio message";
  };
  
  // Get detailed status text
  const getDetailedStatus = () => {
    switch (message.status) {
      case 'pending':
        return "Your message is being prepared for processing";
      case 'sent':
        return "Your message has been sent and is awaiting processing";
      case 'processed':
        return "Your message has been processed and is waiting for an agent to review";
      case 'responded':
        return `Your message has been reviewed by an agent ${responseCount > 0 ? `and has ${responseCount} ${responseCount === 1 ? 'response' : 'responses'}` : ''}`;
      case 'error':
        return "There was an error processing your message";
      default:
        return "";
    }
  };
  
  // Get status text and color
  const getStatusBadge = () => {
    switch (message.status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
      case 'sent':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Sent</span>;
      case 'processed':
        return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">Awaiting Agent</span>;
      case 'responded':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Responded</span>;
      case 'error':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Error</span>;
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`p-4 border rounded-md ${hasUnreadResponses ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} mb-3 cursor-pointer hover:shadow-sm transition-all`}
      onClick={handleToggle}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col items-start space-y-1 flex-1">
          <div className="flex items-center space-x-2 w-full">
            <p className={`${hasUnreadResponses ? 'font-bold' : 'font-normal'} truncate max-w-full`}>
              {getMessageDisplayText()}
            </p>
            {hasUnreadResponses && (
              <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-bold rounded-full animate-pulse">
                New Response
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {formattedDate}
            </span>
            {getStatusBadge()}
            {responseCount > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {responseCount} {responseCount === 1 ? 'Response' : 'Responses'}
              </span>
            )}
          </div>
          
          <p className="text-xs text-gray-600 mt-1 italic">
            {getDetailedStatus()}
          </p>
          
          {lastResponseDate && (
            <div className="flex items-center space-x-1 text-xs text-gray-600 mt-1">
              <span>Last response:</span>
              <span className="font-medium">{lastResponseDate}</span>
              <span>at</span>
              <span className="font-medium">{lastResponseTime}</span>
            </div>
          )}
        </div>
        
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      </div>
      
      {isOpen && (
        <div className="mt-4 pl-4 space-y-3">
          <div className="bg-gray-50 p-3 border border-gray-200 rounded-md">
            <h4 className="font-medium text-sm mb-2">Message Details</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li><span className="font-medium">Status:</span> {message.status.charAt(0).toUpperCase() + message.status.slice(1)}</li>
              <li><span className="font-medium">Sent:</span> {format(message.sentAt, 'MMM dd, yyyy h:mm a')}</li>
              {message.audioUrl && (
                <li className="mt-2">
                  <span className="font-medium block mb-1">Your Audio Message:</span>
                  <audio controls src={message.audioUrl} className="w-full mt-1" />
                </li>
              )}
            </ul>
          </div>
          
          <h4 className="font-medium text-sm">Agent Responses</h4>
          
          {message.responses.length > 0 ? (
            message.responses.map((response, index) => (
              <div 
                key={response.id} 
                className={`p-3 border rounded-md ${!response.isRead ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium">
                    Agent response {index + 1}
                  </p>
                  {!response.isRead && (
                    <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-bold rounded-full">
                      New
                    </span>
                  )}
                </div>
                <p className="py-2 px-3 bg-white rounded border border-gray-100">{response.responseText}</p>
                {response.audioUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Audio Response:</p>
                    <audio controls src={response.audioUrl} className="w-full" />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Responded {formatDistanceToNow(response.sentAt, { addSuffix: true })}
                </p>
              </div>
            ))
          ) : (
            <div className="p-4 border border-gray-200 rounded-md bg-gray-50 text-center">
              <p className="text-gray-500 text-sm">No responses yet</p>
              {message.status === 'processed' && (
                <p className="text-xs text-gray-500 mt-1">An agent will review your message soon</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 