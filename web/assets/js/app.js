// --- PROMO TICKER (versión segura y compatible con tu HTML) ---
(() => {
  const ticker = document.querySelector('.promo-ticker');
  const track  = ticker?.querySelector('.marquee'); // usamos .marquee como track
  if (!ticker || !track) return;

  if (track.__built) return;

  const text = (track.textContent || '').trim();
  if (!text) { ticker.classList.add('show'); return; }

  track.textContent = '';
  const item = document.createElement('span');
  item.className = 'marquee-item';
  item.textContent = text;
  track.appendChild(item);

  const SPEED = 80;
  const MAX_CLONES = 40;

  function build(){
    let clones = 0;
    const need = (ticker.clientWidth || 320) * 2.2;

    while (track.scrollWidth < need && clones < MAX_CLONES) {
      track.appendChild(item.cloneNode(true));
      clones++;
    }

    const duration = (track.scrollWidth * 0.5) / SPEED;
    track.style.setProperty('--marquee-duration', `${duration.toFixed(2)}s`);

    track.__built = true;
    ticker.classList.add('show');
  }

  window.addEventListener('load', build, { once:true });

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      track.__built = false;
      build();
    }, 150);
  }, { passive:true });

  ticker.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
})();