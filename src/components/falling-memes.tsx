import { useCallback, useEffect, useRef, useState } from "react";

import landing0 from "@/assets/images/landing/landing-page.jpeg";
import landing1 from "@/assets/images/landing/landing-page-1.jpeg";
import landing2 from "@/assets/images/landing/landing-page-2.jpeg";
import landing3 from "@/assets/images/landing/landing-page-3.png";
import landing4 from "@/assets/images/landing/landing-page-4.png";

const IMAGES = [landing0, landing1, landing2, landing3, landing4];
const MAX_MEMES = 14;
const SPAWN_INTERVAL_MS = 950;
const GRAVITY = 0.0005;
const MAX_FALL_SPEED = 0.22;
const RELEASE_SPEED_CAP = 0.9;

type Physics = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  el: HTMLDivElement | null;
  dragging: boolean;
};

type MemeItem = { id: number; src: string };

export function FallingMemes() {
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const physicsRef = useRef<Map<number, Physics>>(new Map());
  const nextIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const spawn = () => {
      if (physicsRef.current.size >= MAX_MEMES) return;
      const id = nextIdRef.current++;
      const src = IMAGES[Math.floor(Math.random() * IMAGES.length)]!;
      const size = 88 + Math.random() * 84;
      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      physicsRef.current.set(id, {
        x: Math.random() * Math.max(1, width - size),
        y: -size - 40,
        vx: (Math.random() - 0.5) * 0.04,
        vy: 0.03 + Math.random() * 0.04,
        rotation: (Math.random() - 0.5) * 30,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        size,
        el: null,
        dragging: false,
      });
      setMemes((prev) => [...prev, { id, src }]);
    };
    // Seed a couple immediately so the page isn't empty on first paint.
    spawn();
    spawn();
    const interval = setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const height = window.innerHeight;
      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      const removed: number[] = [];

      physicsRef.current.forEach((p, id) => {
        if (!p.el) return;
        if (!p.dragging) {
          p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL_SPEED);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.rotationSpeed * dt;

          if (p.x < -p.size * 0.6) {
            p.x = -p.size * 0.6;
            p.vx = Math.abs(p.vx) || 0.02;
          } else if (p.x > width - p.size * 0.4) {
            p.x = width - p.size * 0.4;
            p.vx = -Math.abs(p.vx) || -0.02;
          }

          if (p.y > height + 80) {
            removed.push(id);
            return;
          }
        }
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
      });

      if (removed.length > 0) {
        const dropped = new Set(removed);
        dropped.forEach((id) => physicsRef.current.delete(id));
        setMemes((prev) => prev.filter((m) => !dropped.has(m.id)));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: number) => {
      const p = physicsRef.current.get(id);
      if (!p || !p.el) return;
      e.preventDefault();
      try {
        p.el.setPointerCapture(e.pointerId);
      } catch {
        // ignore — capture is best-effort
      }
      p.dragging = true;
      p.vx = 0;
      p.vy = 0;

      const startPointerX = e.clientX;
      const startPointerY = e.clientY;
      const startMemeX = p.x;
      const startMemeY = p.y;
      let lastX = startPointerX;
      let lastY = startPointerY;
      let lastT = performance.now();
      let vx = 0;
      let vy = 0;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const now = performance.now();
        const dt = Math.max(now - lastT, 1);
        vx = (ev.clientX - lastX) / dt;
        vy = (ev.clientY - lastY) / dt;
        lastX = ev.clientX;
        lastY = ev.clientY;
        lastT = now;
        p.x = startMemeX + (ev.clientX - startPointerX);
        p.y = startMemeY + (ev.clientY - startPointerY);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        p.dragging = false;
        p.vx = Math.max(-RELEASE_SPEED_CAP, Math.min(RELEASE_SPEED_CAP, vx));
        p.vy = Math.max(-RELEASE_SPEED_CAP, Math.min(RELEASE_SPEED_CAP, vy));
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          p.el?.releasePointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [],
  );

  const setMemeNode = (id: number) => (el: HTMLDivElement | null) => {
    const p = physicsRef.current.get(id);
    if (!p) return;
    p.el = el;
    if (el) {
      el.style.width = `${p.size}px`;
      el.style.height = `${p.size}px`;
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
    }
  };

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {memes.map((m) => (
        <div
          key={m.id}
          ref={setMemeNode(m.id)}
          onPointerDown={(e) => handlePointerDown(e, m.id)}
          className="pointer-events-auto absolute left-0 top-0 cursor-grab touch-none select-none active:cursor-grabbing"
          style={{ willChange: "transform" }}
        >
          <img
            src={m.src}
            alt=""
            draggable={false}
            className="h-full w-full rounded-2xl object-cover shadow-xl ring-1 ring-black/10"
          />
        </div>
      ))}
    </div>
  );
}
