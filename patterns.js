/* Generative card artwork. Each pattern draws into a 312x192 canvas in the
   card's ink colour and animates over time. Random values are seeded and
   created once, so every visit shows the same picture in motion.

   Motion stops when the cards are off screen or the tab is hidden, and
   people who ask for reduced motion get a single still frame. */
(() => {
  const W = 312, H = 192;
  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Stable pseudo-random value for any integer index (for scrolling patterns).
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const smooth = (x) => x * x * (3 - 2 * x);

  // Hjem: a neighbourhood of little houses. Sales ripple through it as
  // houses fill in and fade back out.
  function houses(rand) {
    const cols = 13, rows = 6, cw = W / cols, rh = H / rows;
    const items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          x: c * cw + cw / 2 + (r % 2 ? cw / 4 : -cw / 4),
          y: r * rh + rh * 0.55,
          phase: rand() * TAU,
          speed: 0.35 + rand() * 0.5,
          line: 0.35 + rand() * 0.3,
        });
      }
    }
    const w = cw * 0.56, h = rh * 0.38, roof = rh * 0.26;
    return (ctx, ink, t) => {
      for (const it of items) {
        const { x, y } = it;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y + h);
        ctx.lineTo(x - w / 2, y);
        ctx.lineTo(x, y - roof);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.closePath();
        // A slow diagonal wave plus each house's own rhythm decides when it "sells".
        const wave = Math.sin(t * it.speed + it.phase + (x + y) * 0.012);
        const sold = smooth(Math.min(1, Math.max(0, (wave - 0.55) / 0.35)));
        ctx.strokeStyle = `rgba(${ink}, ${it.line * (1 - sold)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        if (sold > 0.01) {
          ctx.fillStyle = `rgba(${ink}, ${0.9 * sold})`;
          ctx.fill();
        }
      }
    };
  }

  // Skat: stacked ledger columns, like a year of payslips split into tax
  // lines. The year scrolls slowly past.
  function ledger(rand) {
    const n = 34, gap = 3, bw = (W - gap * (n - 1)) / n;
    const parts = [0.42, 0.24, 0.18, 0.16];
    const jitter = Array.from({ length: n }, () => 0.8 + rand() * 0.2);
    return (ctx, ink, t) => {
      for (let i = 0; i < n; i++) {
        const x = i * (bw + gap);
        const season = 0.5 + 0.5 * Math.sin(i / 5.2 - t * 0.7);
        const breathe = 1 + 0.05 * Math.sin(t * 1.3 + i * 0.9);
        const total = H * (0.45 + 0.5 * season * jitter[i]) * breathe;
        let y = H;
        parts.forEach((p, k) => {
          const hgt = Math.min(total, H) * p;
          y -= hgt;
          ctx.fillStyle = `rgba(${ink}, ${0.85 - k * 0.2})`;
          ctx.fillRect(x, y + 1, bw, hgt - 1.5);
        });
      }
    };
  }

  // DR Arkiv: stacked audio waveforms that scroll like tape playing back.
  function waves(rand) {
    const rows = 6, rh = H / rows, bars = 78, step = W / bars;
    const rowsCfg = Array.from({ length: rows }, (_, r) => ({
      f1: 0.08 + rand() * 0.12,
      f2: 0.3 + rand() * 0.3,
      ph: rand() * 10,
      speed: 2.5 + rand() * 2,        // bars per second
      dir: r % 2 ? -1 : 1,
    }));
    return (ctx, ink, t) => {
      rowsCfg.forEach((cfg, r) => {
        const cy = r * rh + rh / 2;
        const off = t * cfg.speed * cfg.dir;
        const base = Math.floor(off), frac = off - base;
        for (let i = -1; i <= bars; i++) {
          const idx = i + base;
          const env = Math.abs(Math.sin(idx * cfg.f1 + cfg.ph)) * 0.7 + 0.15;
          const amp = env * (0.55 + 0.45 * Math.abs(Math.sin(idx * cfg.f2 + cfg.ph * 2))) *
            (0.7 + hash(idx + r * 1000) * 0.3);
          const hgt = Math.max(1.5, amp * rh * 0.82);
          ctx.fillStyle = `rgba(${ink}, ${0.55 + amp * 0.45})`;
          ctx.fillRect((i - frac) * step, cy - hgt / 2, step * 0.5, hgt);
        }
      });
    };
  }

  // Award Finder: flight arcs from a hub, with planes travelling along them.
  function routes(rand) {
    const hub = [W * 0.42, H * 0.62];
    const legs = [];
    for (let i = 0; i < 14; i++) {
      const x = 14 + rand() * (W - 28), y = 18 + rand() * (H - 30);
      const d = Math.hypot(x - hub[0], y - hub[1]);
      legs.push({
        x, y,
        cx: (x + hub[0]) / 2, cy: (y + hub[1]) / 2 - d * 0.35,
        solid: i % 3 === 0,
        speed: 0.12 + rand() * 0.14,   // trips per second
        phase: rand(),
        out: rand() > 0.5,
      });
    }
    const pointOn = (L, u) => {
      const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      return [a * hub[0] + b * L.cx + c * L.x, a * hub[1] + b * L.cy + c * L.y];
    };
    return (ctx, ink, t) => {
      ctx.fillStyle = `rgba(${ink}, 0.22)`;
      for (let x = 6; x < W; x += 12) for (let y = 6; y < H; y += 12) ctx.fillRect(x, y, 1.2, 1.2);
      ctx.lineCap = 'round';
      for (const L of legs) {
        ctx.beginPath();
        ctx.moveTo(hub[0], hub[1]);
        ctx.quadraticCurveTo(L.cx, L.cy, L.x, L.y);
        ctx.setLineDash(L.solid ? [] : [3, 3]);
        ctx.lineDashOffset = L.solid ? 0 : -t * 8;
        ctx.strokeStyle = `rgba(${ink}, ${L.solid ? 0.9 : 0.5})`;
        ctx.lineWidth = L.solid ? 1.6 : 1.1;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const L of legs) {
        ctx.beginPath();
        ctx.arc(L.x, L.y, 2.6, 0, TAU);
        ctx.fillStyle = `rgb(${ink})`;
        ctx.fill();
        // Plane: eases out of one airport and into the other.
        let u = (t * L.speed + L.phase) % 1;
        u = smooth(u);
        if (!L.out) u = 1 - u;
        const [px, py] = pointOn(L, u);
        const fade = Math.sin(Math.PI * u);
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, TAU);
        ctx.fillStyle = `rgba(${ink}, ${0.35 + 0.65 * fade})`;
        ctx.fill();
      }
      // Hub with a slow radar pulse.
      ctx.beginPath();
      ctx.arc(hub[0], hub[1], 5, 0, TAU);
      ctx.fillStyle = `rgb(${ink})`;
      ctx.fill();
      const p = (t * 0.6) % 1;
      ctx.beginPath();
      ctx.arc(hub[0], hub[1], 7 + p * 14, 0, TAU);
      ctx.strokeStyle = `rgba(${ink}, ${0.6 * (1 - p)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
  }

  // Waitport: a week of queue times, hour by hour, as a heatmap. A "now"
  // marker sweeps through the hours and the queues drift as it passes.
  function queue(rand) {
    const cols = 24, rows = 7, gap = 3;
    const cw = (W - gap * (cols - 1)) / cols, ch = (H - gap * (rows - 1)) / rows;
    const noise = Array.from({ length: rows * cols }, () => ({ a: rand(), ph: rand() * TAU }));
    return (ctx, ink, t) => {
      const now = (t * 1.6) % cols;                 // sweeping current hour
      for (let d = 0; d < rows; d++) {
        for (let h = 0; h < cols; h++) {
          const nz = noise[d * cols + h];
          const morning = Math.exp(-((h - 6.5) ** 2) / 4);
          const evening = Math.exp(-((h - 16.5) ** 2) / 6) * 0.75;
          const weekend = d >= 5 ? 0.8 : 1;
          const drift = 0.75 + nz.a * 0.25 + 0.12 * Math.sin(t * 0.9 + nz.ph);
          let v = Math.min(1, (morning + evening) * weekend * drift);
          // Brighten the column under the sweep.
          const dist = Math.min(Math.abs(h - now), cols - Math.abs(h - now));
          const glow = Math.max(0, 1 - dist / 1.5);
          const x = h * (cw + gap), y = d * (ch + gap);
          if (v < 0.12 && glow < 0.05) {
            ctx.strokeStyle = `rgba(${ink}, 0.22)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
          } else {
            v = Math.max(v, 0.12);
            ctx.fillStyle = `rgba(${ink}, ${Math.min(1, 0.18 + v * 0.82 + glow * 0.25)})`;
            ctx.fillRect(x, y, cw, ch);
          }
        }
      }
    };
  }

  const PATTERNS = { houses, ledger, waves, routes, queue };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const scenes = [...document.querySelectorAll('.card[data-pattern]')].map((card) => {
    const canvas = card.querySelector('canvas');
    const make = PATTERNS[card.dataset.pattern];
    if (!canvas || !make) return null;
    return {
      canvas,
      ctx: canvas.getContext('2d'),
      ink: getComputedStyle(card).getPropertyValue('--ink').trim(),
      draw: make(rng(Number(card.dataset.seed) || 1)),
    };
  }).filter(Boolean);

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const s of scenes) {
      s.canvas.width = W * dpr;
      s.canvas.height = H * dpr;
      s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  let elapsed = 0;            // animation clock in seconds, frozen while paused
  function render() {
    for (const s of scenes) {
      s.ctx.clearRect(0, 0, W, H);
      s.draw(s.ctx, s.ink, elapsed);
    }
  }

  let raf = 0, last = 0, onScreen = true;
  function frame(now) {
    if (last) elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    render();
    raf = requestAnimationFrame(frame);
  }
  function update() {
    const run = onScreen && !document.hidden && !reduce.matches;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!run) render();
  }

  size();
  render();

  const stage = document.querySelector('.stage');
  if (stage && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener?.('change', update);
  matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener?.('change', () => {
    size();
    render();
  });
  update();
})();
