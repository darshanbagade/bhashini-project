import React from 'react';
import { MessageWithResponse } from '../../services/messageService';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsProps {
  messages: MessageWithResponse[];
  onViewMessage: (messageId: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ messages, onViewMessage }) => {
  // Filter messages with unread responses
  const messagesWithUnreadResponses = messages.filter(message => 
    message.responses.some(response => !response.isRead)
  );
  
  // Get the total number of unread responses
  const unreadResponsesCount = messagesWithUnreadResponses.reduce(
    (count, message) => count + message.responses.filter(r => !r.isRead).length, 
    0
  );
  
  // Get count of processed messages awaiting agent response
  const awaitingResponseCount = messages.filter(message => 
    message.status === 'processed'
  ).length;
  
  if (messagesWithUnreadResponses.length === 0 && awaitingResponseCount === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      {unreadResponsesCount > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 font-medium">
                You have {unreadResponsesCount} new {unreadResponsesCount === 1 ? 'response' : 'responses'} from helpline agents
              </p>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  {messagesWithUnreadResponses.map(message => {
                    const unreadCount = message.responses.filter(r => !r.isRead).length;
                    return (
                      <li key={message.id}>
                        <button 
                          className="text-blue-600 hover:underline focus:outline-none"
                          onClick={() => onViewMessage(message.id)}
                        >
                          {unreadCount} new {unreadCount === 1 ? 'response' : 'responses'} to your message from {formatDistanceToNow(message.sentAt, { addSuffix: true })}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {awaitingResponseCount > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-purple-800 font-medium">
                You have {awaitingResponseCount} {awaitingResponseCount === 1 ? 'message' : 'messages'} awaiting agent response
              </p>
              <p className="text-sm text-purple-700 mt-1">
                Our helpline agents are reviewing your messages and will respond as soon as possible.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 