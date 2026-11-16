// 3D Holographic AI Energy Core / Orb
// Inspired by J.A.R.V.I.S. and futuristic holographic interfaces

class HolographicCore {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.state = 'idle'; // idle, listening, thinking, speaking, command
        this.particles = [];
        this.particleCount = 90;
        this.rotationX = 0;
        this.rotationY = 0;
        this.radius = 120;
        this.pulse = 0;
        this.pulseSpeed = 0.03;
        this.audioActivity = 0; // 0 to 1 for voice pulse reactivity

        this.init();
        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.resize();
        this.createParticles();
        this.animate();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.width, this.height) * 0.28;
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            // Fibonacci sphere distribution for uniform 3D sphere points
            const phi = Math.acos(-1 + (2 * i) / this.particleCount);
            const theta = Math.sqrt(this.particleCount * Math.PI) * phi;

            this.particles.push({
                x: Math.cos(theta) * Math.sin(phi),
                y: Math.sin(theta) * Math.sin(phi),
                z: Math.cos(phi),
                baseSize: Math.random() * 2 + 1.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    setState(newState) {
        this.state = newState;
    }

    setAudioActivity(level) {
        this.audioActivity = Math.min(Math.max(level, 0), 1);
    }

    getColorTheme() {
        switch (this.state) {
            case 'listening':
                return {
                    primary: 'rgba(0, 240, 255, 1)',      // Cyan / Electric Blue
                    secondary: 'rgba(0, 150, 255, 0.8)',
                    glow: 'rgba(0, 220, 255, 0.35)',
                    core: 'rgba(0, 255, 240, 0.2)'
                };
            case 'thinking':
                return {
                    primary: 'rgba(215, 60, 255, 1)',      // Holographic Neon Purple
                    secondary: 'rgba(138, 43, 226, 0.8)',
                    glow: 'rgba(180, 50, 255, 0.4)',
                    core: 'rgba(200, 80, 255, 0.25)'
                };
            case 'speaking':
                return {
                    primary: 'rgba(0, 255, 163, 1)',      // Emerald / Jarvis Energy Green
                    secondary: 'rgba(46, 204, 113, 0.8)',
                    glow: 'rgba(0, 255, 163, 0.4)',
                    core: 'rgba(0, 255, 180, 0.3)'
                };
            case 'command':
                return {
                    primary: 'rgba(255, 184, 0, 1)',      // Gold / Amber
                    secondary: 'rgba(255, 140, 0, 0.8)',
                    glow: 'rgba(255, 190, 0, 0.4)',
                    core: 'rgba(255, 200, 50, 0.3)'
                };
            case 'idle':
            default:
                return {
                    primary: 'rgba(0, 212, 255, 0.9)',    // High-tech Deep Cyan
                    secondary: 'rgba(0, 128, 255, 0.6)',
                    glow: 'rgba(0, 180, 255, 0.25)',
                    core: 'rgba(0, 150, 255, 0.15)'
                };
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Rotation speed depending on state
        let speed = 0.008;
        if (this.state === 'thinking') speed = 0.028;
        if (this.state === 'speaking') speed = 0.015;
        if (this.state === 'listening') speed = 0.012;

        this.rotationY += speed;
        this.rotationX += speed * 0.4;
        this.pulse += this.pulseSpeed;

        const colors = this.getColorTheme();

        // Calculate dynamic reactive radius
        const breathing = Math.sin(this.pulse) * 6;
        const voiceBoost = (this.state === 'speaking' || this.state === 'listening') ? (this.audioActivity * 25) : 0;
        const currentRadius = this.radius + breathing + voiceBoost;

        // 1. Draw Central Glowing Holographic Aura
        const coreGradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 10,
            this.centerX, this.centerY, currentRadius * 1.3
        );
        coreGradient.addColorStop(0, colors.core);
        coreGradient.addColorStop(0.5, colors.glow);
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, currentRadius * 1.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Draw Futuristic Orbital Rings (Jarvis Arc Reactor Style)
        this.drawOrbitalRing(currentRadius * 0.9, this.rotationY * 1.2, this.rotationX * 0.8, colors.secondary, 1.5, [4, 8]);
        this.drawOrbitalRing(currentRadius * 1.15, -this.rotationY * 0.9, this.rotationX * 1.1, colors.primary, 1.8, [12, 12]);
        this.drawOrbitalRing(currentRadius * 0.65, this.rotationY * 2.0, -this.rotationX * 1.5, colors.primary, 2.0);

        // 3. Project and Draw 3D Spherical Particles
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const cosX = Math.cos(this.rotationX);
        const sinX = Math.sin(this.rotationX);

        const projected = [];

        for (let p of this.particles) {
            // Y rotation
            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.z * cosY + p.x * sinY;

            // X rotation
            let y1 = p.y * cosX - z1 * sinX;
            let z2 = z1 * cosX + p.y * sinX;

            // Perspective scale
            const scale = (z2 + 2) / 3;
            const px = this.centerX + x1 * currentRadius;
            const py = this.centerY + y1 * currentRadius;

            projected.push({
                x: px,
                y: py,
                z: z2,
                size: Math.max(p.baseSize * scale * (1 + this.audioActivity * 0.5), 0.8),
                alpha: Math.max(0.15, (z2 + 1) / 2)
            });
        }

        // Sort by Z depth for realistic 3D occlusion
        projected.sort((a, b) => a.z - b.z);

        // Connect close neighbor particles with delicate neural hologram lines
        this.ctx.lineWidth = 0.6;
        for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
                const dx = projected[i].x - projected[j].x;
                const dy = projected[i].y - projected[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 45) {
                    const lineAlpha = (1 - dist / 45) * 0.25 * projected[i].alpha;
                    this.ctx.strokeStyle = colors.secondary.replace(/[\d\.]+\)$/, `${lineAlpha})`);
                    this.ctx.beginPath();
                    this.ctx.moveTo(projected[i].x, projected[i].y);
                    this.ctx.lineTo(projected[j].x, projected[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // Render particles
        for (let p of projected) {
            this.ctx.fillStyle = colors.primary.replace(/[\d\.]+\)$/, `${p.alpha})`);
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = colors.primary;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0; // Reset shadow for performance
    }

    drawOrbitalRing(radius, angleY, angleX, color, lineWidth = 1, lineDash = []) {
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);

        const cosY = Math.cos(angleY);
        const cosX = Math.cos(angleX);

        this.ctx.beginPath();
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = color;
        if (lineDash.length > 0) this.ctx.setLineDash(lineDash);

        // Draw rotated ellipse approximation
        const segments = 40;
        for (let i = 0; i <= segments; i++) {
            const rad = (i / segments) * Math.PI * 2;
            const x = Math.cos(rad) * radius * cosY;
            const y = Math.sin(rad) * radius * cosX;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.stroke();
        this.ctx.restore();
    }
}

window.HolographicCore = HolographicCore;
