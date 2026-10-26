"use client";

import { useEffect, useRef, useState } from "react";

/** A quiet, deterministic canopy around the illustrated tree. */
export function AsciiGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let visible = true;
    let frame = 0;
    let width = 0;
    let height = 0;
    const glyphs = [".", ":", "+", "*", "o"];
    const clusters = [[0.30, 0.31, 0.14, 0.13], [0.47, 0.28, 0.15, 0.15], [0.65, 0.29, 0.15, 0.15], [0.76, 0.22, 0.10, 0.11]];
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.font = "11px monospace";
      context.textAlign = "center";
      for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 42; x++) {
          const px = (x + 0.5) / 42;
          const py = (y + 0.5) / 38;
          const density = Math.max(...clusters.map(([cx, cy, rx, ry]) => 1 - ((px - cx) / rx) ** 2 - ((py - cy) / ry) ** 2));
          const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
          const noise = seed - Math.floor(seed);
          if (density < 0 || noise > 0.34 + density * 0.4) continue;
          const drift = Math.sin(frame * 0.04 + y * 0.4 + x * 0.14) * 2;
          context.fillStyle = `rgba(62, 102, 54, ${0.16 + density * 0.31})`;
          context.fillText(glyphs[Math.floor((noise * 13 + Math.floor(frame / 18)) % glyphs.length)], px * width + drift, py * height);
        }
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * scale;
      canvas.height = height * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      draw();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    const timer = window.setInterval(() => {
      if (!paused && !reducedMotion && visible && !document.hidden) { frame++; draw(); }
    }, 100);
    return () => { window.clearInterval(timer); observer.disconnect(); resizeObserver.disconnect(); };
  }, [paused, reducedMotion]);

  return <><canvas ref={canvasRef} className="ub-ascii-garden" aria-hidden="true" /><button className="ub-motion-control" type="button" onClick={() => { const resume = paused || reducedMotion; setPaused(!resume); if (resume) setReducedMotion(false); }} aria-label={`${paused || reducedMotion ? "Resume" : "Pause"} decorative canopy motion`}>{paused || reducedMotion ? "▶ Resume motion" : "Ⅱ Pause motion"}</button></>;
}
