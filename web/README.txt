Barretodo – Sitio estático

# Reemplazos rápidos
1) Formspree
   - Abrí pages/contacto.html y reemplazá la acción del formulario:
     action="https://formspree.io/f/your-id"
   - Por tu ID real de Formspree.

2) Imágenes
   - Reemplazá los placeholders en assets/img/:
     - hero.jpg (cabecera)
     - concentrados.jpg, descartables.jpg, dispenser.jpg, herramientas.jpg, aromatizacion.jpg, insecticidas.jpg
     - brand1.png … brand6.png
   - Mantené el tamaño y relación para evitar imágenes deformadas (object-fit: cover).

3) SEO por página
   - Abrí cada archivo .html y ajustá:
     <title>…</title>
     <meta name="description" content="…">
     <link rel="canonical" href="https://barretodo.com.ar/...">
   - Todos los archivos tienen textos y metas de ejemplo listos.

# Hosting
- Todas las rutas son relativas (sin "/" inicial). Ideal para GitHub Pages u hospedajes simples.
- Si usás GitHub Pages con dominio propio, agregá un archivo CNAME con: barretodo.com.ar
- En Cloudflare, hacé "Purge Cache" después de subir.

# QA
- Probado en 320px, 768px y 1280px.
- Lighthouse objetivo: >90 en Performance/SEO/Accesibilidad en entorno estático.
