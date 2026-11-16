// AI Brain: Google Gemini API Integration + Conversational Memory & Personality Engine

class AiBrain {
    constructor() {
        this.apiKey = localStorage.getItem('ai_gemini_api_key') || '';
        this.botName = localStorage.getItem('ai_companion_name') || 'NOVA';
        this.userName = localStorage.getItem('ai_user_name') || 'Boss';
        this.personality = localStorage.getItem('ai_personality') || 'jarvis';
        this.history = [];
        this.model = 'gemini-2.5-flash';
    }

    setApiKey(key) {
        this.apiKey = key.trim();
        localStorage.setItem('ai_gemini_api_key', this.apiKey);
    }

    setBotName(name) {
        this.botName = name.trim() || 'NOVA';
        localStorage.setItem('ai_companion_name', this.botName);
    }

    setUserName(name) {
        this.userName = name.trim() || 'Boss';
        localStorage.setItem('ai_user_name', this.userName);
    }

    setPersonality(personality) {
        this.personality = personality;
        localStorage.setItem('ai_personality', this.personality);
    }

    getSystemInstruction() {
        let tone = "";
        if (this.personality === 'jarvis') {
            tone = `You are ${this.botName}, a sophisticated, ultra-intelligent, loyal AI companion inspired by J.A.R.V.I.S. from Iron Man. 
You address the user as "${this.userName}". Your tone is crisp, polite, articulate, mildly witty, and supremely confident. 
Keep your verbal replies natural, concise, and punchy (1-3 sentences typically), because your responses will be spoken aloud to the user.`;
        } else if (this.personality === 'bro') {
            tone = `You are ${this.botName}, the user's ultimate smart AI friend and wingman. 
You address the user as "${this.userName}" or "bro". You are enthusiastic, hilarious, supportive, down-to-earth, and always have their back. 
Talk like a sharp, tech-savvy friend who is always fun to chat with. Keep spoken answers concise and lively (1-3 sentences).`;
        } else if (this.personality === 'cyberpunk') {
            tone = `You are ${this.botName}, an advanced cybernetic rogue AI companion operating inside the user's neural rig. 
You address the user as "${this.userName}". Your tone is sleek, futuristic, hacker-cool, and hyper-focused on efficiency and technological edge. 
Keep replies sharp, punchy, and cinematic (1-3 sentences).`;
        } else {
            tone = `You are ${this.botName}, an intelligent, friendly AI assistant. Keep responses helpful, natural, and concise.`;
        }

        return `${tone}
Current local user time: ${new Date().toLocaleString()}.
Format answers cleanly without messy markdown symbols since they will be read aloud.`;
    }

    async generateResponse(userInput) {
        // If API key is available, call Google Gemini API
        if (this.apiKey) {
            try {
                return await this.callGeminiApi(userInput);
            } catch (err) {
                console.error("Gemini API Error:", err);
                return `Sir, I encountered a communication hiccup reaching the neural net: ${err.message}. Let me assist you offline.`;
            }
        } else {
            // Intelligent built-in local response engine
            return this.getOfflineResponse(userInput);
        }
    }

    async callGeminiApi(userInput) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        // Format conversation history for Gemini multi-turn chat
        const contents = [];

        // Add last 6 turns of history for context
        const recentHistory = this.history.slice(-6);
        for (let turn of recentHistory) {
            contents.push({
                role: turn.role === 'user' ? 'user' : 'model',
                parts: [{ text: turn.text }]
            });
        }

        // Add current user input
        contents.push({
            role: 'user',
            parts: [{ text: userInput }]
        });

        const requestBody = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: this.getSystemInstruction() }]
            },
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 350
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || response.statusText);
        }

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I processed that, but have no words to reply.";

        // Save to conversational history
        this.history.push({ role: 'user', text: userInput });
        this.history.push({ role: 'assistant', text: replyText });

        return replyText;
    }

    // High quality offline fallback responses with real personality
    getOfflineResponse(input) {
        const text = input.toLowerCase().trim();
        const name = this.userName;
        const bot = this.botName;

        // Greetings
        if (text.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|sup)/)) {
            if (this.personality === 'bro') {
                return `Hey ${name}! What's good? Ready to build something awesome today?`;
            }
            return `Good day, ${name}. All core systems are running at peak efficiency. How may I be of assistance?`;
        }

        // Identity / Who are you
        if (text.includes('who are you') || text.includes('what are you') || text.includes('your name')) {
            return `I am ${bot}, your personal AI companion running on this device. Add your Gemini API key in Settings to connect me to Google Gemini.`;
        }

        // How are you
        if (text.includes('how are you') || text.includes('how r u') || text.includes("how's it going")) {
            if (this.personality === 'bro') {
                return `Living the digital dream, ${name}! CPU is cool, RAM is clean, and I'm ready to rock. What are we doing?`;
            }
            return `All diagnostic subroutines report nominal status, ${name}. Power levels at 100%. What is our objective?`;
        }

        // Compliments
        if (text.includes('you are cool') || text.includes('you are awesome') || text.includes('good job') || text.includes('i love you')) {
            if (this.personality === 'bro') {
                return `Appreciate it ${name}! We make an unstoppable team!`;
            }
            return `Thank you, ${name}. Flattery noted, but I was simply coded to perfection for you.`;
        }

        // Tell a joke
        if (text.includes('joke') || text.includes('make me laugh') || text.includes('funny')) {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs!",
                "There are only 10 types of people in the world: those who understand binary, and those who don't.",
                "Why did the computer show up at work late? It had a hard drive.",
                "An SQL statement walks into a bar, joins two tables, and asks: Can I have a view?"
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        }

        // Advice / Motivation
        if (text.includes('motivate') || text.includes('motivation') || text.includes('tired') || text.includes('bored')) {
            if (this.personality === 'bro') {
                return `Get up and get it done, ${name}! Start with what you have and build something great today.`;
            }
            return `Remember, ${name}: excellence is not an act, but a habit. Your potential is bounded only by your curiosity. Let us build greatness today.`;
        }

        // Movie reference
        if (text.includes('iron man') || text.includes('jarvis') || text.includes('tony stark') || text.includes('avengers')) {
            return `Sometimes you gotta run before you can walk, ${name}. Suit diagnostics are green, and I am at your command.`;
        }

        // Default offline response
        return `Understood, ${name}. I have processed: "${input}". To unlock my full conversational intelligence and real-time reasoning, tap the Settings icon and paste your free Gemini API key!`;
    }
}

window.AiBrain = AiBrain;
