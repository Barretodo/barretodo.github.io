
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


// Promo ticker compacto: clona el mensaje lo justo para un loop sin huecos
document.addEventListener('DOMContentLoaded', () => {
  const ticker = document.querySelector('.promo-ticker');
  const track  = ticker?.querySelector('.marquee');
  if (!ticker || !track) return;

  // Envolver el texto original en un span (item base)
  const base = document.createElement('span');
  base.textContent = track.textContent.trim();
  base.className = 'marquee-item';
  track.textContent = '';
  track.appendChild(base);

  // Clonar hasta cubrir > 200% del ancho visible (loop perfecto con @keyframes -50%)
  const needWidth = (ticker.clientWidth || 320) * 2.1;
  while (track.scrollWidth < needWidth) {
    track.appendChild(base.cloneNode(true));
  }

  // Velocidad consistente (~80 px/s)
  const SPEED = 80;
  const duration = (track.scrollWidth * 0.5) / SPEED; // animamos -50%
  track.style.setProperty('--marquee-duration', `${duration.toFixed(2)}s`);

  // Fade-in
  ticker.classList.add('show');

  // Recalcular en resize (simple y corto)
  let t; window.addEventListener('resize', () => {
    clearTimeout(t); t = setTimeout(() => {
      while (track.scrollWidth < (ticker.clientWidth * 2.1)) {
        track.appendChild(base.cloneNode(true));
      }
      const d = (track.scrollWidth * 0.5) / SPEED;
      track.style.setProperty('--marquee-duration', `${d.toFixed(2)}s`);
    }, 120);
  }, {passive:true});
});
