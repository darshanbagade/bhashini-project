import React from 'react';
import { MessageWithResponse } from '../../services/messageService';

interface MessageStatsProps {
  messages: MessageWithResponse[];
}

const MessageStats: React.FC<MessageStatsProps> = ({ messages }) => {
  if (messages.length === 0) {
    return null;
  }
  
  // Calculate stats
  const totalMessages = messages.length;
  const respondedMessages = messages.filter(m => m.status === 'responded').length;
  const processingMessages = messages.filter(m => m.status === 'processed').length;
  const pendingMessages = messages.filter(m => ['pending', 'sent'].includes(m.status)).length;
  const totalResponses = messages.reduce((total, msg) => total + msg.responses.length, 0);
  
  // Calculate response rate
  const responseRate = totalMessages > 0 
    ? Math.round((respondedMessages / totalMessages) * 100) 
    : 0;
    
  // Calculate average response time (if available)
  let avgResponseTime = 'N/A';
  const messagesWithResponses = messages.filter(m => 
    m.responses.length > 0 && m.lastResponseAt
  );
  
  if (messagesWithResponses.length > 0) {
    const totalResponseTime = messagesWithResponses.reduce((total, msg) => {
      const responseTime = msg.lastResponseAt 
        ? (msg.lastResponseAt.getTime() - msg.sentAt.getTime()) / (1000 * 60) // minutes
        : 0;
      return total + responseTime;
    }, 0);
    
    const avgMinutes = Math.round(totalResponseTime / messagesWithResponses.length);
    if (avgMinutes < 60) {
      avgResponseTime = `${avgMinutes} min`;
    } else {
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      avgResponseTime = `${hours}h ${mins}m`;
    }
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-center">
        <p className="text-2xl font-bold text-blue-700">
          {totalMessages}
        </p>
        <p className="text-xs text-blue-600">Total Messages</p>
      </div>
      
      <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center">
        <p className="text-2xl font-bold text-green-700">
          {respondedMessages}
        </p>
        <p className="text-xs text-green-600">Responded</p>
        <p className="text-xs text-green-500 mt-1">{responseRate}% response rate</p>
      </div>
      
      <div className="bg-purple-50 p-3 rounded-md border border-purple-100 text-center">
        <p className="text-2xl font-bold text-purple-700">
          {processingMessages}
        </p>
        <p className="text-xs text-purple-600">Awaiting Response</p>
      </div>
      
      <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-center">
        <p className="text-2xl font-bold text-yellow-700">
          {totalResponses}
        </p>
        <div className="flex flex-col">
          <p className="text-xs text-yellow-600">Total Responses</p>
          <p className="text-xs text-yellow-500 mt-1">Avg time: {avgResponseTime}</p>
        </div>
      </div>
    </div>
  );
};

export default MessageStats; 