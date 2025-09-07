
(function(){
  const t=document.querySelector('.slide-track'); const dots=[...document.querySelectorAll('.dot')];
  if(!t||!dots.length) return; let i=0;
  function go(n){ i=n%dots.length; t.style.transform=`translateX(-${i*100}%)`; dots.forEach((d,k)=>d.classList.toggle('active',k===i)); }
  go(0); setInterval(()=>go(i+1),4000);
})();

async function loadCats(){
  const wrap=document.getElementById('cats'); if(!wrap) return;
  const base = location.pathname.includes('/pages/') ? '..' : '.';
  const res = await fetch(base + '/data/categories.json'); const data = await res.json();
  wrap.innerHTML = data.categories.map(c=>`
    <article class="cat">
      <img src="${base}/${c.image}" alt="${c.title}">
      <div class="pad">
        <div class="badge">${c.title}</div>
        <p class="muted">${c.description}</p>
        <button class="btn primary" data-cat="${c.key}">Ver productos</button>
      </div>
    </article>
  `).join('');
  wrap.querySelectorAll('[data-cat]').forEach(btn=>btn.addEventListener('click',()=>openCat(btn.getAttribute('data-cat'), data)));
}
function openCat(key, data){
  const c = data.categories.find(x=>x.key===key); if(!c) return;
  document.getElementById('modalTitle').textContent=c.title;
  document.getElementById('modalDesc').textContent=c.description;
  document.getElementById('modalList').innerHTML = c.items.map(i=>`<li>${i}</li>`).join('');
  document.getElementById('modal').classList.add('show');
}
document.addEventListener('click',e=>{ if(e.target.matches('[data-close]')||e.target.id==='modal') document.getElementById('modal').classList.remove('show'); });
document.addEventListener('DOMContentLoaded',loadCats);
