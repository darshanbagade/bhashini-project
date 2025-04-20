import axios from 'axios';

interface ProcessAudioResponse {
  pipelineResponse: Array<{
    output?: Array<{
      source?: string;
      target?: string;
    }>;
    audio?: Array<{
      audioContent: string;
    }>;
  }>;
}

export const processAudioWithBhashini = async (base64Audio: string): Promise<ProcessAudioResponse> => {
  try {
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

    // Call our backend API endpoint
    const response = await axios.post('/api/process-audio', { base64Audio });
    
    return response.data;
  } catch (error) {
    console.error('Error processing audio with Bhashini:', error);
    throw error;
  }
};

export const extractTranscriptionText = (responseData: ProcessAudioResponse): string => {
  return responseData?.pipelineResponse?.[0]?.output?.[0]?.source || '';
};

export const extractTranslatedText = (responseData: ProcessAudioResponse): string => {
  return responseData?.pipelineResponse?.[1]?.output?.[0]?.target || '';
};

export const extractAudioContent = (responseData: ProcessAudioResponse): string => {
  return responseData?.pipelineResponse?.[2]?.audio?.[0]?.audioContent || '';
};

// Convert base64 to Blob for audio playback
export const base64ToBlob = (base64: string, mimeType = 'audio/wav'): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = Array.from(slice).map((ch) => ch.charCodeAt(0));
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}; 