document.addEventListener("DOMContentLoaded",()=>{
  fetch("categories.json").then(r=>r.json()).then(data=>{
    const grid=document.getElementById("rubros");
    data.rubros.forEach(rubro=>{
      const div=document.createElement("div");
      div.innerHTML=`<img src="${rubro.image}" alt="${rubro.title}" style="width:100px;height:100px"><h3>${rubro.title}</h3><p>${rubro.description}</p>`;
      div.onclick=()=>openModal(rubro);
      grid.appendChild(div);
    });
  });

  const modal=document.getElementById("modal");
  const close=document.getElementById("closeModal");
  close.onclick=()=>modal.classList.add("hidden");

  function openModal(rubro){
    document.getElementById("modalTitle").textContent=rubro.title;
    document.getElementById("modalDescription").textContent=rubro.description;
    const ul=document.getElementById("modalItems");
    ul.innerHTML="";
    rubro.items.forEach(item=>{
      const li=document.createElement("li");
      li.textContent=item;
      ul.appendChild(li);
    });
    modal.classList.remove("hidden");
  }
});