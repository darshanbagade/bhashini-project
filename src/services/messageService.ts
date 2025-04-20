import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Unsubscribe,
  doc,
  getDoc,
  getDocs,
  limit,
  updateDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { ref, push, get, query, orderByChild, equalTo } from 'firebase/database';

// Types
export interface Message {
  id: string;
  userId: string;
  content: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface Response {
  id: string;
  messageId: string;
  userId: string;
  agentId: string;
  responseText: string;
  audioUrl: string | null;
  sentAt: Date;
  isRead: boolean;
}

export interface MessageWithResponse {
  id: string;
  userId: string;
  transcriptionText: string | null;
  translatedText: string | null;
  audioUrl: string | null;
  location: { latitude: number; longitude: number } | null;
  status: 'pending' | 'sent' | 'processed' | 'responded' | 'error';
  sentAt: Date;
  lastResponseAt: Date | null;
  responses: Response[];
}

// Get messages for a user
export const getUserMessages = (
  userId: string, 
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('userId', '==', userId),
    orderBy('sentAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      messages.push({
        id: doc.id,
        userId: data.userId,
        status: data.status,
        transcriptionText: data.transcriptionText || null,
        translatedText: data.translatedText || null,
        audioUrl: data.audioUrl || null,
        location: data.location || null,
        sentAt: data.sentAt?.toDate() || new Date(),
        lastResponseAt: data.lastResponseAt?.toDate() || null
      });
    });
    
    callback(messages);
  });
};

// Get all messages for agents
export const getAllMessages = (
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    orderBy('sentAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      messages.push({
        id: doc.id,
        userId: data.userId,
        status: data.status,
        transcriptionText: data.transcriptionText || null,
        translatedText: data.translatedText || null,
        audioUrl: data.audioUrl || null,
        location: data.location || null,
        sentAt: data.sentAt?.toDate() || new Date(),
        lastResponseAt: data.lastResponseAt?.toDate() || null
      });
    });
    
    callback(messages);
  });
};

// Get responses for a specific message
export const getMessageResponses = (
  messageId: string,
  callback: (responses: Response[]) => void
): Unsubscribe => {
  const responsesRef = collection(db, 'responses');
  const q = query(
    responsesRef,
    where('messageId', '==', messageId),
    orderBy('sentAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const responses: Response[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      responses.push({
        id: doc.id,
        messageId: data.messageId,
        userId: data.userId,
        agentId: data.agentId,
        responseText: data.responseText,
        audioUrl: data.audioUrl,
        sentAt: data.sentAt?.toDate() || new Date(),
        isRead: data.isRead || false
      });
    });
    
    callback(responses);
  });
};

// Get all responses for a user
export const getUserResponses = (
  userId: string,
  callback: (responses: Response[]) => void
): Unsubscribe => {
  const responsesRef = collection(db, 'responses');
  const q = query(
    responsesRef,
    where('userId', '==', userId),
    orderBy('sentAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const responses: Response[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      responses.push({
        id: doc.id,
        messageId: data.messageId,
        userId: data.userId,
        agentId: data.agentId,
        responseText: data.responseText,
        audioUrl: data.audioUrl,
        sentAt: data.sentAt?.toDate() || new Date(),
        isRead: data.isRead || false
      });
    });
    
    callback(responses);
  });
};

// Get message history with responses for a user
export const getUserMessageHistory = (
  userId: string,
  callback: (messagesWithResponses: MessageWithResponse[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'messages');
  const responsesRef = collection(db, 'responses');
  
  // Create queries
  const messagesQuery = query(
    messagesRef, 
    where('userId', '==', userId),
    orderBy('sentAt', 'desc')
  );
  
  const responsesQuery = query(
    responsesRef,
    where('userId', '==', userId),
    orderBy('sentAt', 'desc')
  );
  
  // Use a more complex snapshot listener that combines both collections
  let messages: Message[] = [];
  let responses: Response[] = [];
  
  // Function to combine messages and responses
  const combineData = () => {
    const messagesWithResponses: MessageWithResponse[] = messages.map(message => {
      const messageResponses = responses.filter(response => response.messageId === message.id)
        .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
      
      return {
        ...message,
        responses: messageResponses
      };
    });
    
    callback(messagesWithResponses);
  };
  
  // Set up listeners
  const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messages = snapshot.docs.map(doc => {
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
        lastResponseAt: data.lastResponseAt?.toDate() || null
      } as Message;
    });
    
    combineData();
  });
  
  const unsubscribeResponses = onSnapshot(responsesQuery, (snapshot) => {
    responses = snapshot.docs.map(doc => {
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
      } as Response;
    });
    
    combineData();
  });
  
  // Return a function to unsubscribe both listeners
  return () => {
    unsubscribeMessages();
    unsubscribeResponses();
  };
};

// Get latest unread responses for a user (for notifications)
export const getUnreadResponses = async (userId: string): Promise<Response[]> => {
  const responsesRef = collection(db, 'responses');
  const q = query(
    responsesRef,
    where('userId', '==', userId),
    where('isRead', '==', false),
    orderBy('sentAt', 'desc'),
    limit(5)
  );
  
  const snapshot = await getDocs(q);
  const responses: Response[] = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    responses.push({
      id: doc.id,
      messageId: data.messageId,
      userId: data.userId,
      agentId: data.agentId,
      responseText: data.responseText,
      audioUrl: data.audioUrl,
      sentAt: data.sentAt?.toDate() || new Date(),
      isRead: data.isRead || false
    });
  });
  
  return responses;
};

// Get user info
export const getUserInfo = async (userId: string): Promise<{ name: string; email: string }> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      name: data.name || 'Unknown User',
      email: data.email || ''
    };
  }
  
  return {
    name: 'Unknown User',
    email: ''
  };
};

// Mark a response as read
export const markResponseAsRead = async (responseId: string) => {
  try {
    const responseRef = doc(db, 'responses', responseId);
    await updateDoc(responseRef, {
      isRead: true
    });
    return true;
  } catch (error) {
    console.error('Error marking response as read:', error);
    return false;
  }
}; 