
document.addEventListener('DOMContentLoaded', async () => {
  // slider
  const slides = [...document.querySelectorAll('.slide')];
  const dots = document.getElementById('slider-dots');
  slides.forEach((_,i)=>{
    const b=document.createElement('button');
    if(i===0) b.classList.add('active');
    b.addEventListener('click',()=>go(i));
    dots.appendChild(b);
  });
  let curr=0; const N=slides.length;
  function render(){ slides.forEach((s,i)=> s.style.opacity = (i===curr?1:0)); dots.querySelectorAll('button').forEach((d,i)=>d.classList.toggle('active', i===curr)) }
  function go(i){ curr=i; render(); }
  render(); setInterval(()=>go((curr+1)%N), 5000);

  // load categories and bind modals
  const grid = document.getElementById('rubros-grid');
  if(grid){
    const data = await fetch('/data/categories.json').then(r=>r.json()).catch(()=>[]);
    data.forEach(cat=>{
      const el=document.createElement('div');
      el.className='card';
      el.innerHTML=`<h3>${cat.name}</h3><p class="muted">${cat.desc}</p>`;
      el.addEventListener('click',()=>openModal(cat));
      grid.appendChild(el);
    });
  }

  const modal=document.getElementById('modal');
  function openModal(cat){
    modal.querySelector('#modal-body').innerHTML=`<h2>${cat.name}</h2><p>${cat.desc}</p><ul>${cat.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
    modal.classList.add('show');
  }
  modal?.addEventListener('click', (e)=>{
    if(e.target===modal || e.target.hasAttribute('data-close')) modal.classList.remove('show');
  });
});
