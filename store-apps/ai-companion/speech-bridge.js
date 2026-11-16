import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

if (Capacitor.isNativePlatform()) {
  window.aiCompanionSpeech = {
    start: async ({ onPartial, onStopped } = {}) => {
      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== 'granted') throw new Error('Allow microphone and speech recognition to use voice input.');
      await SpeechRecognition.removeAllListeners();
      if (onPartial) await SpeechRecognition.addListener('partialResults', event => onPartial(event.matches?.[0] || ''));
      if (onStopped) await SpeechRecognition.addListener('listeningState', event => { if (event.status === 'stopped') onStopped(); });
      return SpeechRecognition.start({ language: 'en-US', maxResults: 1, partialResults: true, popup: false });
    },
    stop: () => SpeechRecognition.stop()
  };
}
