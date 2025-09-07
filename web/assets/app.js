
// Modal + categories
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalList = document.getElementById('modalList');
const modalCTA = document.getElementById('modalCTA');
if (modal) {
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> modal.classList.remove('open')));
  modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.classList.remove('open'); });
}
fetch('categories.json')
  .then(r => r.json())
  .then(({categories}) => {
    const grid = document.getElementById('cats');
    if(grid){
      grid.innerHTML = categories.map(cat => `
        <a class="cat" href="#" data-key="${cat.key}" aria-label="${cat.title}">
          <img class="media" src="${cat.image}" alt="${cat.title}" loading="lazy">
          <span class="label">${cat.title}</span>
        </a>`).join('');
      [...grid.querySelectorAll('[data-key]')].forEach(el => {
        el.addEventListener('click', (ev)=>{
          ev.preventDefault();
          const key = el.dataset.key;
          const c = categories.find(x=>x.key===key);
          if(!c) return;
          if (!modal) return;
          modalTitle.textContent = c.title;
          modalDesc.textContent = c.description || '';
          modalList.innerHTML = (c.items||[]).map(i => `<li>${i}</li>`).join('') || '<li>Próximamente</li>';
          modalCTA.href = `https://wa.me/5491151022954?text=Hola%20Barretodo%2C%20quiero%20consultar%20por%20${encodeURIComponent(c.title)}`;
          modal.classList.add('open');
        });
      });
    }
  }).catch(()=>{});

// Simple slider
const track = document.querySelector('.slide-track');
const dots = document.querySelectorAll('.dot');
let current = 0;
function go(i){
  if(!track) return;
  current = i % dots.length;
  track.style.transform = `translateX(-${current*100}%)`;
  dots.forEach((d,k)=>d.classList.toggle('active', k===current));
}
dots.forEach((d,i)=>d.addEventListener('click', ()=>go(i)));
if (dots.length) { go(0); setInterval(()=>go((current+1)%dots.length), 5000); }
