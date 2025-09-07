
(function(){
  // Slider
  const slides=[...document.querySelectorAll('.slide')];
  const dots=document.querySelector('.dots');
  if(slides.length && dots){
    slides.forEach((_,i)=>{const b=document.createElement('button'); if(i===0)b.classList.add('active'); b.onclick=()=>go(i); dots.appendChild(b)});
    let c=0; function render(){slides.forEach((s,i)=>s.classList.toggle('active',i===c)); dots.querySelectorAll('button').forEach((d,i)=>d.classList.toggle('active',i===c));}
    function go(i){c=i; render()}
    render(); setInterval(()=>go((c+1)%slides.length), 5000);
  }
  // Categories
  async function loadCats(){
    const paths=['data/categories.json','../data/categories.json','/data/categories.json'];
    let data=null;
    for(const u of paths){
      try{ const r=await fetch(u,{cache:'no-cache'}); if(r.ok){ data=await r.json(); break; } }catch(e){}
    }
    if(!data) return;
    const wrap=document.querySelector('#cats')||document.querySelector('#rubros-grid');
    if(!wrap) return;
    wrap.innerHTML='';
    data.forEach(cat=>{
      const el=document.createElement('div');
      el.className='card';
      el.innerHTML=`<h3>${cat.name}</h3><p class="muted">${cat.desc}</p>`;
      el.onclick=()=>openModal(cat);
      wrap.appendChild(el);
    });
  }
  function openModal(cat){
    const m=document.getElementById('modal'); if(!m) return;
    m.querySelector('#m-title').textContent = cat.name;
    m.querySelector('#m-body').innerHTML = `<p>${cat.desc}</p><ul>${cat.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
    m.classList.add('show');
  }
  document.addEventListener('DOMContentLoaded', loadCats);
  document.addEventListener('click', e=>{
    if(e.target.matches('[data-close]') || e.target.classList.contains('modal')){ e.preventDefault(); (e.target.closest('.modal')||e.target).classList.remove('show'); }
  });
})();