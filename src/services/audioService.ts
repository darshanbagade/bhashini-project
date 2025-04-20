import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

// Audio recording service
export const startRecording = async (): Promise<MediaRecorder> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: BlobPart[] = [];

  mediaRecorder.addEventListener('dataavailable', (event) => {
    audioChunks.push(event.data);
  });

  mediaRecorder.start();
  return mediaRecorder;
};

export const stopRecording = (mediaRecorder: MediaRecorder): Promise<Blob> => {
  return new Promise((resolve) => {
    const audioChunks: BlobPart[] = [];
    
    const handleDataAvailable = (event: BlobEvent) => {
      audioChunks.push(event.data);
    };

    const handleStop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.removeEventListener('stop', handleStop);
      resolve(audioBlob);
    };

    mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
    mediaRecorder.addEventListener('stop', handleStop);
    mediaRecorder.stop();
    
    // Stop all audio tracks
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  });
};

// File upload service
export const uploadAudio = async (
  audioBlob: Blob, 
  userId: string,
  location: { latitude: number; longitude: number } | null
): Promise<{ audioUrl: string; messageId: string }> => {
  try {
    // Create a reference to the messages collection
    const messagesRef = collection(db, 'messages');
    
    // Add a new document with user ID and timestamp
    const docRef = await addDoc(messagesRef, {
      userId,
      status: 'pending',
      type: 'audio',
      sentAt: serverTimestamp(),
      location: location || null
    });
    
    // Create storage reference
    const storageRef = ref(storage, `audio/${docRef.id}.wav`);
    
    // Upload audio blob to storage
    await uploadBytes(storageRef, audioBlob);
    
    // Get download URL
    const audioUrl = await getDownloadURL(storageRef);
    
    // Update document with audio URL
    await updateDoc(doc(db, 'messages', docRef.id), {
      audioUrl,
      status: 'sent'
    });
    
    return { audioUrl, messageId: docRef.id };
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};

// Transcribe and translate audio
export const processAudio = async (
  audioUrl: string, 
  messageId: string
): Promise<void> => {
  try {
    console.log('Processing audio:', audioUrl);
    
    // Instead of making an API call, we'll just use placeholder text
    const transcriptionText = "This is a placeholder transcription text. In a production environment, this would be the actual transcription of the audio.";
    const translatedText = "This is a placeholder translation. In a production environment, this would be the translated text.";
    
    // Update the message in Firestore
    await updateDoc(doc(db, 'messages', messageId), {
      transcriptionText,
      translatedText,
      status: 'processed'
    });
    
    console.log('Audio processing completed successfully.');
    return;
  } catch (error) {
    console.error('Error processing audio:', error);
    
    // Update the message status
    await updateDoc(doc(db, 'messages', messageId), {
      status: 'error',
      errorMessage: 'Failed to process audio'
    });
    
    throw error;
  }
};

// Create agent response
export const createAgentResponse = async (
  messageId: string,
  userId: string,
  agentId: string,
  responseText: string,
  audioBlob?: Blob
): Promise<void> => {
  try {
    const responsesRef = collection(db, 'responses');
    
    const responseData: any = {
      messageId,
      userId,
      agentId,
      responseText,
      sentAt: serverTimestamp(),
      status: 'sent',
      isRead: false // Add isRead field to track if user has seen the response
    };
    
    // If audio response is provided
    if (audioBlob) {
      // Create storage reference
      const responseRef = await addDoc(responsesRef, responseData);
      const storageRef = ref(storage, `responses/${responseRef.id}.wav`);
      
      // Upload audio blob to storage
      await uploadBytes(storageRef, audioBlob);
      
      // Get download URL
      const audioUrl = await getDownloadURL(storageRef);
      
      // Update document with audio URL
      await updateDoc(doc(db, 'responses', responseRef.id), {
        audioUrl
      });
    } else {
      // Just add the text response
      await addDoc(responsesRef, responseData);
    }
    
    // Update original message status
    await updateDoc(doc(db, 'messages', messageId), {
      status: 'responded',
      lastResponseAt: serverTimestamp() // Add timestamp of the last response
    });
    
    return;
  } catch (error) {
    console.error('Error creating agent response:', error);
    throw error;
  }
};

// Mark response as read
export const markResponseAsRead = async (responseId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'responses', responseId), {
      isRead: true
    });
  } catch (error) {
    console.error('Error marking response as read:', error);
  }
}; 