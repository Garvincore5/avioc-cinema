// Voice Engine: Speech Recognition (Voice Input) & Speech Synthesis (Voice Output)

class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.selectedVoice = null;
        this.voiceRate = 1.05;
        this.voicePitch = 1.0;
        this.isSpeaking = false;
        this.speechVolume = 1.0;
        this.audioPulseInterval = null;

        this.initRecognition();
        this.loadVoices();

        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;

        // Try to pick a sophisticated British or smooth natural English voice for that movie AI / Jarvis vibe
        const preferred = [
            'Google UK English Male',
            'Microsoft George Online (Natural) - English (United Kingdom)',
            'Microsoft George - English (United Kingdom)',
            'Google UK English Female',
            'Daniel',
            'Microsoft David - English (United States)',
            'Google US English'
        ];

        for (let name of preferred) {
            const found = voices.find(v => v.name.includes(name) || v.name === name);
            if (found) {
                this.selectedVoice = found;
                break;
            }
        }

        if (!this.selectedVoice) {
            this.selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }

        // Notify settings UI if voice select element exists
        if (window.populateVoiceList) {
            window.populateVoiceList(voices, this.selectedVoice);
        }
    }

    initRecognition() {
        if (window.aiCompanionSpeech) {
            this.nativeSpeech = window.aiCompanionSpeech;
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser engine.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            if (window.soundFX) window.soundFX.playListen();
            if (window.core) window.core.setState('listening');
            if (window.updateStatus) window.updateStatus("Listening...", "listening");
            if (window.updateMicButton) window.updateMicButton(true);
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (interimTranscript && window.setTranscriptPreview) {
                window.setTranscriptPreview(interimTranscript);
            }

            if (finalTranscript) {
                if (window.handleUserSpeechInput) {
                    window.handleUserSpeechInput(finalTranscript.trim());
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.warn("Speech Recognition Error:", event.error);
            this.isListening = false;
            if (window.updateMicButton) window.updateMicButton(false);
            if (window.core) window.core.setState('idle');
            if (window.updateStatus) window.updateStatus("Online & Ready", "online");
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (window.updateMicButton) window.updateMicButton(false);
            if (!this.isSpeaking && window.core && window.core.state === 'listening') {
                window.core.setState('idle');
                if (window.updateStatus) window.updateStatus("Online & Ready", "online");
            }
        };
    }

    toggleListening() {
        if (this.nativeSpeech) {
            if (this.isListening) {
                this.nativeSpeech.stop().catch((error) => console.warn('Speech stop failed:', error));
                this.isListening = false;
                if (window.updateMicButton) window.updateMicButton(false);
                if (window.core) window.core.setState('idle');
                if (window.updateStatus) window.updateStatus('Online & Ready', 'online');
                return;
            }
            this.isListening = true;
            if (window.soundFX) window.soundFX.playListen();
            if (window.core) window.core.setState('listening');
            if (window.updateStatus) window.updateStatus('Listening...', 'listening');
            if (window.updateMicButton) window.updateMicButton(true);
            this.nativeSpeech.start({
                onPartial: (text) => { if (text && window.setTranscriptPreview) window.setTranscriptPreview(text); },
                onStopped: () => {
                    this.isListening = false;
                    if (window.updateMicButton) window.updateMicButton(false);
                    if (window.core) window.core.setState('idle');
                    if (window.updateStatus) window.updateStatus('Online & Ready', 'online');
                }
            }).then(result => {
                const transcript = result.matches?.[0]?.trim();
                if (transcript && window.handleUserSpeechInput) window.handleUserSpeechInput(transcript);
            }).catch(error => {
                console.warn('Native speech recognition failed:', error);
                if (window.updateStatus) window.updateStatus(error.message || 'Voice input unavailable', 'online');
            }).finally(() => {
                this.isListening = false;
                if (window.updateMicButton) window.updateMicButton(false);
                if (window.core) window.core.setState('idle');
            });
            return;
        }
        if (!this.recognition) {
            alert("Speech Recognition is not supported by your current browser. You can type messages in the input box below!");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            // Cancel current speech if AI is talking
            if (this.isSpeaking) {
                this.stopSpeaking();
            }
            try {
                this.recognition.start();
            } catch (e) {
                console.error("Recognition start failed:", e);
            }
        }
    }

    // Speak a sentence out loud
    speak(text, onComplete = null) {
        if (!this.synth) return;
        this.synth.cancel(); // Stop any pending speech

        // Clean text of markdown asterisks/emojis before speaking
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[#*_~\[\]]/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.rate = this.voiceRate;
        utterance.pitch = this.voicePitch;
        utterance.volume = this.speechVolume;

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (window.core) window.core.setState('speaking');
            if (window.updateStatus) window.updateStatus("Speaking...", "speaking");

            // Simulate voice waveforms / pulse to the core
            this.audioPulseInterval = setInterval(() => {
                if (window.core) {
                    window.core.setAudioActivity(Math.random() * 0.8 + 0.2);
                }
                if (window.visualizer) {
                    window.visualizer.pulseWave(Math.random());
                }
            }, 100);
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            clearInterval(this.audioPulseInterval);
            if (window.core) {
                window.core.setAudioActivity(0);
                window.core.setState('idle');
            }
            if (window.visualizer) window.visualizer.resetWave();
            if (window.updateStatus) window.updateStatus("Online & Ready", "online");
            if (onComplete) onComplete();
        };

        utterance.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            this.isSpeaking = false;
            clearInterval(this.audioPulseInterval);
            if (window.core) {
                window.core.setAudioActivity(0);
                window.core.setState('idle');
            }
            if (window.updateStatus) window.updateStatus("Online & Ready", "online");
        };

        this.synth.speak(utterance);
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
            this.isSpeaking = false;
            clearInterval(this.audioPulseInterval);
            if (window.core) {
                window.core.setAudioActivity(0);
                window.core.setState('idle');
            }
        }
    }
}

window.VoiceEngine = VoiceEngine;
