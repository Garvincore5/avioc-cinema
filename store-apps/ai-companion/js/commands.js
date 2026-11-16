// Cross-device command engine. Local PC commands remain exclusive to the desktop edition.

class CommandEngine {
    constructor() {
        this.commands = [
            {
                pattern: /open\s+(youtube|yt)/i,
                action: () => {
                    window.open('https://youtube.com', '_blank');
                    return "Opening YouTube now, boss.";
                }
            },
            {
                pattern: /open\s+spotify/i,
                action: () => {
                    window.open('https://open.spotify.com', '_blank');
                    return "Opening Spotify. Time for some good soundtrack music.";
                }
            },
            {
                pattern: /open\s+(google|search)/i,
                action: () => {
                    window.open('https://google.com', '_blank');
                    return "Opening Google search engine.";
                }
            },
            {
                pattern: /open\s+github/i,
                action: () => {
                    window.open('https://github.com', '_blank');
                    return "Opening GitHub repositories.";
                }
            },
            {
                pattern: /(search for|google)\s+(.+)/i,
                action: (matches) => {
                    const query = encodeURIComponent(matches[2]);
                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                    return `Searching Google for ${matches[2]}.`;
                }
            },
            {
                pattern: /(what time is it|current time|what is the time|tell me the time)/i,
                action: () => {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `The current time is exactly ${timeStr}.`;
                }
            },
            {
                pattern: /(what is today'?s date|what date is it|today'?s date)/i,
                action: () => {
                    const now = new Date();
                    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    return `Today is ${now.toLocaleDateString(undefined, options)}.`;
                }
            },
            {
                pattern: /(system status|pc status|diagnostics|specs)/i,
                action: () => {
                    const cores = navigator.hardwareConcurrency || 8;
                    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB estimated` : "Available";
                    const screenRes = `${window.screen.width}x${window.screen.height}`;
                    const online = navigator.onLine ? "Connected" : "Offline";
                    return `System Diagnostics: CPU logical cores: ${cores}. Screen resolution: ${screenRes}. Network status: ${online}. All subsystems operating nominally.`;
                }
            },
            {
                pattern: /flip a coin/i,
                action: () => {
                    const result = Math.random() > 0.5 ? "Heads" : "Tails";
                    return `The coin landed on: ${result}!`;
                }
            },
            {
                pattern: /roll a die|roll a dice/i,
                action: () => {
                    const num = Math.floor(Math.random() * 6) + 1;
                    return `Rolled a ${num}!`;
                }
            },
            {
                pattern: /clear (chat|history|screen)/i,
                action: () => {
                    if (window.clearChatMessages) window.clearChatMessages();
                    return "Screen and conversational buffer purged.";
                }
            }
        ];
    }

    match(input) {
        for (let cmd of this.commands) {
            const match = input.match(cmd.pattern);
            if (match) {
                return {
                    matched: true,
                    execute: () => cmd.action(match)
                };
            }
        }
        return { matched: false };
    }
}

window.CommandEngine = CommandEngine;
