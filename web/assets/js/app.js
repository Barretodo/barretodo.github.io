
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
