// Web Audio API authentic procedural sound synthesizer (Zero external dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playPaySuccess() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Iconic 3-note Google Pay ascending cheerful chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.38);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  playCashRegister() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Cash chime ring
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.15);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {}
  }

  playAlert() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(720, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  playClick() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  playReset() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Procedural clean reset chime: gentle descending tone sequence
      const notes = [783.99, 659.25, 523.25];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.07);
        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.18, now + index * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.25);
      });
    } catch {}
  }

  speakAnnouncement(text, lang = "en-IN") {
    if (this.muted || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }
}

export const sounds = new SoundFX();

// Lightweight procedural canvas confetti
export function triggerConfetti(canvasRef) {
  if (!canvasRef || !canvasRef.current) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = (canvas.width = canvas.offsetWidth || 400);
  const height = (canvas.height = canvas.offsetHeight || 500);

  const colors = ["#4285F4", "#EA4335", "#FBBC04", "#34A853", "#9C27B0", "#00BCD4"];
  const particles = Array.from({ length: 70 }, () => ({
    x: width / 2,
    y: height / 2 - 40,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.8) * 12,
    size: Math.random() * 8 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 10,
    alpha: 1,
  }));

  let animationFrame;
  let startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, width, height);

    let alive = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // gravity
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      if (elapsed > 1200) p.alpha = Math.max(0, p.alpha - 0.02);

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (alive && elapsed < 3500) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
}

