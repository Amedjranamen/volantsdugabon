import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export default function Confetti({ active, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Colors: Gabon Flag (Green, Yellow, Blue) + Event brand Red
    const COLORS = [
      '#009E60', // Gabonese Flag Green
      '#FCD116', // Gabonese Flag Yellow
      '#3A75C4', // Gabonese Flag Blue
      '#dc2626', // Brand Accent Red
      '#f59e0b', // Amber/Gold Joyful accent
      '#10b981', // Vivid Emerald Green
      '#3b82f6', // Vivid Electric Blue
    ];

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles originating as bursts from lower corners
    const createParticles = () => {
      const pCount = 130;
      
      // Left side cannon
      for (let i = 0; i < pCount / 2; i++) {
        particles.push({
          x: 0,
          y: canvas.height * 0.85,
          size: Math.random() * 8 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: Math.random() > 0.6 ? 'circle' : Math.random() > 0.5 ? 'triangle' : 'square',
          vx: Math.random() * 16 + 12, // Launch strongly outwards to the right
          vy: -(Math.random() * 22 + 16), // Launch strongly upwards
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          opacity: 1,
        });
      }

      // Right side cannon
      for (let i = 0; i < pCount / 2; i++) {
        particles.push({
          x: canvas.width,
          y: canvas.height * 0.85,
          size: Math.random() * 8 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: Math.random() > 0.6 ? 'circle' : Math.random() > 0.5 ? 'triangle' : 'square',
          vx: -(Math.random() * 16 + 12), // Launch strongly outwards to the left
          vy: -(Math.random() * 22 + 16), // Launch strongly upwards
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          opacity: 1,
        });
      }
    };

    createParticles();

    const gravity = 0.42;
    const friction = 0.975;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      particles.forEach((p) => {
        // Gravity and drag velocities
        p.vy += gravity;
        p.vx *= friction;
        p.vy *= friction;
        
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.vy > 1.5) {
          p.opacity -= 0.0075;
        }

        if (p.opacity > 0 && p.y < canvas.height && p.x > -50 && p.x < canvas.width + 50) {
          activeCount++;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          ctx.beginPath();
          if (p.shape === 'circle') {
            ctx.arc(0, 0, p.size / 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'triangle') {
            ctx.moveTo(0, -p.size / 1.6);
            ctx.lineTo(p.size / 1.6, p.size / 1.6);
            ctx.lineTo(-p.size / 1.6, p.size / 1.6);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 1.8, -p.size / 1.8, p.size, p.size);
          }
          ctx.restore();
        }
      });

      if (activeCount > 0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[120]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
