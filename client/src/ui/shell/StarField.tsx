import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  twinkleOffset: number;
  twinkleSpeed: number;
  vx: number;
  vy: number;
}

interface Flash {
  x: number;
  y: number;
  createdAt: number;
}

const STAR_COUNT = 300;
const MAX_FLASHES = 8;
const FLASH_DURATION = 700; // ms

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let stars: Star[] = [];
    let flashes: Flash[] = [];
    // Numeric pair key (i < j always): i * STAR_COUNT + j
    const collidingPairs = new Set<number>();

    // Mouse state — plain mutable object, no React overhead
    const mouse = { x: -9999, y: -9999, active: false };
    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; };
    const onMouseLeave = () => { mouse.active = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);

    const CURSOR_REPEL_RADIUS = 85;
    const CURSOR_REPEL_STRENGTH = 1.2;  // pixels per frame at closest point

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initStars = () => {
      stars = Array.from({ length: STAR_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.35;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 0.8 + Math.random() * 1.7,
          baseOpacity: 0.3 + Math.random() * 0.7,
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.2 + Math.random() * 0.6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        };
      });
    };

    resize();
    initStars();
    window.addEventListener('resize', resize);

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      const t = now / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update star positions (wrap around edges)
      const scale = dt / 16;
      for (const star of stars) {
        star.x += star.vx * scale;
        star.y += star.vy * scale;

        // Gentle cursor repulsion
        if (mouse.active) {
          const rdx = star.x - mouse.x;
          const rdy = star.y - mouse.y;
          const rDistSq = rdx * rdx + rdy * rdy;
          if (rDistSq < CURSOR_REPEL_RADIUS * CURSOR_REPEL_RADIUS && rDistSq > 0) {
            const rDist = Math.sqrt(rDistSq);
            const force = ((CURSOR_REPEL_RADIUS - rDist) / CURSOR_REPEL_RADIUS) * CURSOR_REPEL_STRENGTH;
            star.x += (rdx / rDist) * force * scale;
            star.y += (rdy / rDist) * force * scale;
          }
        }

        if (star.x < -2) star.x = canvas.width + 2;
        else if (star.x > canvas.width + 2) star.x = -2;
        if (star.y < -2) star.y = canvas.height + 2;
        else if (star.y > canvas.height + 2) star.y = -2;
      }

      // Collision detection — fires only when stars actually touch (dist ≤ sum of radii)
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const distSq = dx * dx + dy * dy;
          const touchDist = stars[i].radius + stars[j].radius;
          const key = i * STAR_COUNT + j;

          if (distSq <= touchDist * touchDist) {
            if (!collidingPairs.has(key) && flashes.length < MAX_FLASHES) {
              collidingPairs.add(key);
              flashes.push({
                x: (stars[i].x + stars[j].x) / 2,
                y: (stars[i].y + stars[j].y) / 2,
                createdAt: now,
              });
            }
          } else {
            collidingPairs.delete(key);
          }
        }
      }

      // Draw flashes (remove expired ones)
      flashes = flashes.filter((f) => now - f.createdAt < FLASH_DURATION);
      for (const flash of flashes) {
        const progress = (now - flash.createdAt) / FLASH_DURATION;
        // Ease out: fast expand, slow fade
        const radius = Math.sqrt(progress) * 38;
        const opacity = Math.pow(1 - progress, 1.4) * 0.72;

        // Outer glow
        const grd = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
        grd.addColorStop(0,    `rgba(255, 255, 240, ${opacity})`);
        grd.addColorStop(0.2,  `rgba(255, 240, 180, ${opacity * 0.85})`);
        grd.addColorStop(0.5,  `rgba(180, 210, 255, ${opacity * 0.5})`);
        grd.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Bright white core (only visible in the first ~40% of duration)
        const coreOpacity = Math.max(0, Math.pow(1 - progress / 0.4, 2)) * 0.9;
        if (coreOpacity > 0.01) {
          const coreR = 2.5;
          const coreGrd = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, coreR);
          coreGrd.addColorStop(0, `rgba(255, 255, 255, ${coreOpacity})`);
          coreGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(flash.x, flash.y, coreR, 0, Math.PI * 2);
          ctx.fillStyle = coreGrd;
          ctx.fill();
        }
      }

      // Draw stars
      for (const star of stars) {
        const twinkle = 0.15 * Math.sin(t * star.twinkleSpeed * Math.PI * 2 + star.twinkleOffset);
        const opacity = Math.max(0.05, Math.min(1, star.baseOpacity + twinkle));

        // Soft glow halo for larger stars only
        if (star.radius > 1.1) {
          const glowR = star.radius * 3.5;
          const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
          grd.addColorStop(0, `rgba(180, 210, 255, ${opacity * 0.3})`);
          grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Core star dot (slightly blue-white tint)
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215, 230, 255, ${opacity})`;
        ctx.fill();
      }

      animFrameId = requestAnimationFrame(draw);
    };

    animFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
