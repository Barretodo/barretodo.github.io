
let slideIdx=0;
function showSlide(i){const imgs=[...document.querySelectorAll('.slider img')];const dots=[...document.querySelectorAll('.dot')];imgs.forEach(e=>e.classList.remove('active'));dots.forEach(e=>e.classList.remove('active'));imgs[i].classList.add('active');dots[i].classList.add('active');}
setInterval(()=>{const imgs=document.querySelectorAll('.slider img');if(!imgs.length)return;slideIdx=(slideIdx+1)%imgs.length;showSlide(slideIdx);},4000);

const modal={ref:null,data:{},open(k){this.ref=document.getElementById('modal');const b=this.ref.querySelector('.body');const t=this.ref.querySelector('.title');const items=this.data[k]||[];t.textContent=k;b.innerHTML=`<ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;this.ref.classList.add('open');},close(){this.ref?.classList.remove('open');}};
fetch('data/categories.json').then(r=>r.json()).then(j=>modal.data=j);

const path=location.pathname;document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===path|| (a.getAttribute('data-root')==='true'&&path==='/'))a.classList.add('active');});
