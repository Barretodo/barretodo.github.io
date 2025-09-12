
// Menu toggle
const toggle = document.getElementById('menuToggle');
const navList = document.getElementById('navList');
if (toggle && navList){
  toggle.addEventListener('click', ()=>{
    if (window.matchMedia('(max-width:600px)').matches){
      navList.style.display = navList.style.display === 'block' ? 'none' : 'block';
    }
  });
}

// Year
const y = document.getElementById('year');
if (y){ y.textContent = new Date().getFullYear(); }

// Modals
function openModal(name){
  const m = document.getElementById('modal-'+name);
  if (!m) return;
  m.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}
function closeModal(name){
  const m = document.getElementById('modal-'+name);
  if (!m) return;
  m.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-modal]').forEach(btn=>{
  btn.addEventListener('click', ()=> openModal(btn.dataset.modal));
});
document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el=>{
  el.addEventListener('click', ()=> closeModal(el.dataset.close));
});

// Prevent CLS
document.querySelectorAll('.card-img').forEach(img=>{
  img.loading = 'lazy';
  img.decoding = 'async';
});



});

// --- PROMO TICKER (versión segura y compatible con tu HTML) ---
(() => {
  const ticker = document.querySelector('.promo-ticker');
  const track  = ticker?.querySelector('.marquee'); // usamos .marquee como track
  if (!ticker || !track) return;

  if (track.__built) return;

  const text = (track.textContent || '').trim();
  if (!text) { ticker.classList.add('show'); return; }

  // Limpiamos y armamos un solo item base
  track.textContent = '';
  const item = document.createElement('span');
  item.className = 'marquee-item';
  item.textContent = text;
  track.appendChild(item);

  const SPEED = 80;        // px/seg
  const MAX_CLONES = 40;   // techo de seguridad

  function build(){
    let clones = 0;
    const need = (ticker.clientWidth || 320) * 2.2; // cubrir ~220% (animamos -50%)

    while (track.scrollWidth < need && clones < MAX_CLONES) {
      track.appendChild(item.cloneNode(true));
      clones++;
    }

    const duration = (track.scrollWidth * 0.5) / SPEED; // -50% del total
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

  // pausa al hover (opcional)
  ticker.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
})();



// Debug rápido: mostrar el ticker aunque no haya clonado todavía
document.addEventListener('DOMContentLoaded', () => {
  const t = document.querySelector('.promo-ticker');
  if (t) t.classList.add('show');
});
