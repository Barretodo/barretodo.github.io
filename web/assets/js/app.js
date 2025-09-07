
(function(){
  const track=document.querySelector('.slide-track');
  const dots=[...document.querySelectorAll('.dot')];
  if(!track||dots.length===0) return;
  let i=0; function go(n){i=(n+dots.length)%dots.length;track.style.transform=`translateX(-${i*100}%)`;dots.forEach((d,k)=>d.classList.toggle('active',k===i));}
  go(0); setInterval(()=>go(i+1),4200);
})();
async function loadCats(){
  const wrap=document.getElementById('cats'); if(!wrap) return;
  const base = location.pathname.includes('/pages/') ? '..' : '.';
  const res=await fetch(base + '/data/categories.json'); const data=await res.json();
  wrap.innerHTML = data.categories.map(c=>`
    <article class="cat" role="button" tabindex="0">
      <img src="${base}/${c.image}" alt="${c.title}">
      <div class="pad">
        <div class="badge">${c.title}</div>
        <p class="muted">${c.description}</p>
      </div>
    </article>`).join('');
  wrap.querySelectorAll('.cat').forEach((el,idx)=>{
    el.addEventListener('click',()=>openModal(data.categories[idx]));
    el.addEventListener('keypress',(e)=>{ if(e.key==='Enter') openModal(data.categories[idx]); });
  });
}
function openModal(c){
  document.getElementById('modalTitle').textContent=c.title;
  document.getElementById('modalDesc').textContent=c.description;
  const ul=document.getElementById('modalList'); ul.innerHTML=''; (c.items||[]).forEach(i=>{ const li=document.createElement('li'); li.textContent=i; ul.appendChild(li); });
  const msg=encodeURIComponent('Hola Barretodo, quiero consultar por ' + c.title);
  document.getElementById('modalCTA').href='https://wa.me/5491151022954?text='+msg;
  document.getElementById('modal').classList.add('show');
}
document.addEventListener('click',(e)=>{ if(e.target.matches('[data-close]')||e.target.id==='modal') document.getElementById('modal').classList.remove('show'); });
document.addEventListener('DOMContentLoaded',loadCats);
