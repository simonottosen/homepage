/* Generative card artwork. Each pattern draws into a 312x192 canvas in the
   card's ink colour. Seeded so every visit renders the same picture. */
(() => {
  const W = 312, H = 192;

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

  // Hjem: a neighbourhood of little houses; filled ones are recent sales.
  function houses(ctx, ink, rand) {
    const cols = 13, rows = 6;
    const cw = W / cols, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw / 2 + (r % 2 ? cw / 4 : -cw / 4);
        const y = r * rh + rh * 0.55;
        const w = cw * 0.56, h = rh * 0.38, roof = rh * 0.26;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y + h);
        ctx.lineTo(x - w / 2, y);
        ctx.lineTo(x, y - roof);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.closePath();
        const v = rand();
        if (v > 0.78) {
          ctx.fillStyle = `rgba(${ink}, ${0.75 + rand() * 0.25})`;
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(${ink}, ${0.35 + v * 0.35})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
    }
  }

  // Skat: stacked ledger columns, like a year of payslips split into tax lines.
  function ledger(ctx, ink, rand) {
    const n = 34, gap = 3;
    const bw = (W - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = i * (bw + gap);
      const total = H * (0.45 + 0.5 * (0.5 + 0.5 * Math.sin(i / 5.2)) * (0.8 + rand() * 0.2));
      let y = H;
      const parts = [0.42, 0.24, 0.18, 0.16];
      parts.forEach((p, k) => {
        const h = total * p;
        y -= h;
        ctx.fillStyle = `rgba(${ink}, ${0.85 - k * 0.2})`;
        ctx.fillRect(x, y + 1, bw, h - 1.5);
      });
    }
  }

  // DR Arkiv: stacked audio waveforms, like reels of old broadcasts.
  function waves(ctx, ink, rand) {
    const rows = 6, rh = H / rows;
    const bars = 78, step = W / bars;
    for (let r = 0; r < rows; r++) {
      const cy = r * rh + rh / 2;
      const f1 = 0.08 + rand() * 0.12, f2 = 0.3 + rand() * 0.3, ph = rand() * 10;
      for (let i = 0; i < bars; i++) {
        const env = Math.abs(Math.sin(i * f1 + ph)) * 0.7 + 0.15;
        const amp = env * (0.55 + 0.45 * Math.abs(Math.sin(i * f2 + ph * 2))) * (0.7 + rand() * 0.3);
        const h = Math.max(1.5, amp * rh * 0.82);
        ctx.fillStyle = `rgba(${ink}, ${0.55 + amp * 0.45})`;
        ctx.fillRect(i * step, cy - h / 2, step * 0.5, h);
      }
    }
  }

  // Award Finder: dotted airports joined by flight arcs.
  function routes(ctx, ink, rand) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      pts.push([14 + rand() * (W - 28), 18 + rand() * (H - 30)]);
    }
    const hub = [W * 0.42, H * 0.62];
    // faint grid of dots, like a map
    ctx.fillStyle = `rgba(${ink}, 0.22)`;
    for (let x = 6; x < W; x += 12) for (let y = 6; y < H; y += 12) ctx.fillRect(x, y, 1.2, 1.2);
    ctx.lineCap = 'round';
    pts.forEach(([x, y], i) => {
      const mx = (x + hub[0]) / 2, my = (y + hub[1]) / 2;
      const d = Math.hypot(x - hub[0], y - hub[1]);
      ctx.beginPath();
      ctx.moveTo(hub[0], hub[1]);
      ctx.quadraticCurveTo(mx, my - d * 0.35, x, y);
      ctx.setLineDash(i % 3 === 0 ? [] : [3, 3]);
      ctx.strokeStyle = `rgba(${ink}, ${i % 3 === 0 ? 0.9 : 0.55})`;
      ctx.lineWidth = i % 3 === 0 ? 1.6 : 1.1;
      ctx.stroke();
    });
    ctx.setLineDash([]);
    pts.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${ink})`;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(hub[0], hub[1], 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${ink})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hub[0], hub[1], 9, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ink}, 0.6)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Waitport: a week of queue times, hour by hour, as a heatmap.
  function queue(ctx, ink, rand) {
    const cols = 24, rows = 7, gap = 3;
    const cw = (W - gap * (cols - 1)) / cols;
    const ch = (H - gap * (rows - 1)) / rows;
    for (let d = 0; d < rows; d++) {
      for (let h = 0; h < cols; h++) {
        const morning = Math.exp(-((h - 6.5) ** 2) / 4);
        const evening = Math.exp(-((h - 16.5) ** 2) / 6) * 0.75;
        const weekend = d >= 5 ? 0.8 : 1;
        let v = (morning + evening) * weekend * (0.75 + rand() * 0.35);
        v = Math.min(1, v);
        const x = h * (cw + gap), y = d * (ch + gap);
        if (v < 0.12) {
          ctx.strokeStyle = `rgba(${ink}, 0.22)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
        } else {
          ctx.fillStyle = `rgba(${ink}, ${0.18 + v * 0.82})`;
          ctx.fillRect(x, y, cw, ch);
        }
      }
    }
  }

  const PATTERNS = { houses, ledger, waves, routes, queue };

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    document.querySelectorAll('.card[data-pattern]').forEach((card) => {
      const canvas = card.querySelector('canvas');
      const fn = PATTERNS[card.dataset.pattern];
      if (!canvas || !fn) return;
      const ink = getComputedStyle(card).getPropertyValue('--ink').trim();
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      fn(ctx, ink, rng(Number(card.dataset.seed) || 1));
    });
  }

  draw();
  matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener?.('change', draw);
})();
