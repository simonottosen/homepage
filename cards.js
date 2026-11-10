(() => {
  const stage = document.querySelector('.stage');
  const inner = stage.querySelector('.stage-inner');
  const cards = [...stage.querySelectorAll('.card')];
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const W = 228, H = 288;        // resting card
  const OW = 360, OH = 464;      // open card
  const PAD = 24;                // breathing room above/below the fan, stage units

  // Resting fan: top-left offsets from the stage origin, plus tilt.
  const FAN = [
    { x: -420, y: -154, r: -8 },
    { x: -265, y: -124, r: 4 },
    { x: -114, y: -185, r: -2 },
    { x: 33, y: -128, r: 1 },
    { x: 196, y: -163, r: 5 },
  ];
  // Midpoint between the outermost card centres (≈0, the fan is symmetric).
  const FAN_MID = (FAN[0].x + FAN[FAN.length - 1].x + W) / 2;
  // Small fan the other cards drop into while one is open.
  const REST = [
    { r: -4, dy: 0 },
    { r: -2, dy: 1 },
    { r: 2, dy: 5 },
    { r: 3, dy: 9 },
  ];

  let open = -1;

  function metrics() {
    const vw = document.documentElement.clientWidth;
    const s = Math.min(1, Math.max(0.52, vw / 720));        // stage scale
    const avail = (vw - 24) / s;                             // usable width in stage units
    const xf = Math.min(1, Math.max(0.35, (avail - 268) / 616)); // horizontal fan squeeze
    const target = Math.min(OW, vw - 80);                    // open card width on screen
    const e = target / (OW * s);                             // extra scale for open card
    return { s, xf, e };
  }

  function layout() {
    const { s, xf, e } = metrics();
    const top = -200;                                        // fan top edge (approx, incl. tilt)

    let bottom;
    if (open < 0) {
      cards.forEach((card, i) => {
        const f = FAN[i];
        card.style.zIndex = i + 1;
        // Squeeze card centres towards the fan's middle so it stays centred.
        const cx = FAN_MID + (f.x + W / 2 - FAN_MID) * xf;
        card.style.transform = `translate(${cx - W / 2}px, ${f.y}px) rotate(${f.r}deg)`;
      });
      bottom = 180;
    } else {
      const cy = top + (OH * e) / 2;                         // open card centre y
      const selBottom = top + OH * e;
      const os = 0.7 * Math.min(e, 1.35);                    // scale of the small cards
      const restCy = selBottom - 34 * e + (H * os) / 2;
      const spacing = 52 * (os / 0.7) * Math.max(xf, 0.8);
      let rank = 0;
      cards.forEach((card, i) => {
        card.style.zIndex = i + 1;
        if (i === open) {
          card.style.transform = `translate(${-OW / 2}px, ${cy - OH / 2}px) scale(${e})`;
          return;
        }
        const r = REST[rank];
        const cx = (rank - 1.5) * spacing;
        card.style.transform =
          `translate(${cx - W / 2}px, ${restCy - H / 2 + r.dy}px) scale(${os}) rotate(${r.r}deg)`;
        rank++;
      });
      bottom = selBottom - 34 * e + H * os + 16;
    }

    const height = (bottom - top + PAD * 2) * s;
    stage.style.height = `${Math.ceil(height)}px`;
    inner.style.top = `${(-top + PAD) * s}px`;
    inner.style.transform = `scale(${s})`;
  }

  function setOpen(i) {
    open = i;
    stage.classList.toggle('has-open', open >= 0);
    cards.forEach((card, j) => {
      const isOpen = j === open;
      card.classList.toggle('is-open', isOpen);
      const btn = card.querySelector('.card-hit');
      btn.setAttribute('aria-expanded', String(isOpen));
      const name = card.querySelector('.card-title').innerText.replace(/\s+/g, ' ').trim();
      btn.setAttribute('aria-label', `${name}: ${isOpen ? 'hide' : 'show'} details`);
      // Keep the visit link out of the tab order while hidden.
      card.querySelector('.visit').tabIndex = isOpen ? 0 : -1;
    });
    layout();
  }

  cards.forEach((card, i) => {
    card.querySelector('.card-hit').addEventListener('click', (ev) => {
      ev.stopPropagation();
      setOpen(open === i ? -1 : i);
    });
    card.querySelector('.visit').addEventListener('click', (ev) => ev.stopPropagation());
  });

  document.addEventListener('click', (ev) => {
    if (open >= 0 && !ev.target.closest('.card')) setOpen(-1);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && open >= 0) {
      const btn = cards[open].querySelector('.card-hit');
      setOpen(-1);
      btn.focus();
    }
  });

  let raf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(layout);
  });

  // Place cards without animating on first paint.
  stage.classList.add('no-anim');
  setOpen(-1);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('no-anim')));
})();
