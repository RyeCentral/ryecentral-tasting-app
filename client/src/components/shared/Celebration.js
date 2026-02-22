import React, { useEffect, useRef, useState } from 'react';

/**
 * Celebration — confetti + fireworks canvas animation
 * Triggers when `active` prop is true. Auto-fades after ~6 seconds.
 */
export default function Celebration({ active }) {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) { setVisible(false); return; }
    setVisible(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Confetti particles ──────────────────
    const COLORS = ['#f5a623', '#e0931a', '#d4af37', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#fff'];
    const particles = [];

    class Particle {
      constructor() {
        this.reset(true);
      }
      reset(initial) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height * -1 : -10;
        this.w = 4 + Math.random() * 6;
        this.h = 3 + Math.random() * 4;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = 2 + Math.random() * 4;
        this.rotation = Math.random() * 360;
        this.rotSpeed = (Math.random() - 0.5) * 12;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.opacity = 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.04; // gravity
        this.rotation += this.rotSpeed;
        this.vx *= 0.99;
        if (this.y > canvas.height + 20) {
          this.opacity = 0;
        }
      }
      draw(ctx) {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
      }
    }

    // ── Firework bursts ─────────────────────
    const sparks = [];

    class Spark {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.life = 1;
        this.decay = 0.015 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.06;
        this.vx *= 0.98;
        this.life -= this.decay;
      }
      draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function createBurst(x, y) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 30 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        sparks.push(new Spark(x, y, color));
      }
    }

    // Spawn initial confetti
    for (let i = 0; i < 150; i++) {
      particles.push(new Particle());
    }

    // Schedule firework bursts
    const burstTimers = [];
    const burstCount = 6;
    for (let i = 0; i < burstCount; i++) {
      burstTimers.push(setTimeout(() => {
        createBurst(
          canvas.width * 0.15 + Math.random() * canvas.width * 0.7,
          canvas.height * 0.1 + Math.random() * canvas.height * 0.4
        );
      }, i * 800 + Math.random() * 400));
    }

    // ── Animation loop ──────────────────────
    let frameId;
    let startTime = Date.now();
    const DURATION = 6000;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw confetti
      for (const p of particles) {
        p.update();
        p.opacity = 1 - progress * 0.8;
        p.draw(ctx);
      }

      // Update & draw sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].update();
        sparks[i].draw(ctx);
        if (sparks[i].life <= 0) sparks.splice(i, 1);
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setVisible(false);
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      burstTimers.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
