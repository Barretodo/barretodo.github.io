CATÁLOGO VISUAL BARRETODO - INSTRUCCIONES

1) SUBIR A LA WEB
Subí la carpeta completa "catalogo-barretodo-v2" al servidor.
Recomendado: renombrarla como "catalogo" para que quede:
www.barretodo.com.ar/catalogo/

2) EDITAR PRODUCTOS
Archivo: data/productos.js
Cada producto tiene:
- id: identificador único, no repetir.
- category: categoría del producto.
- name: nombre visible.
- presentation: medida/presentación.
- wholesale: precio mayorista. Usar número sin puntos. Si no querés mostrar precio, poner null.
- retail: precio minorista. Usar número sin puntos. Si no querés mostrar precio, poner null.
- image: ruta de imagen webp.
- tags: etiquetas usadas por el asistente para recomendar productos.

Ejemplo:
{ id:"lavandina-5l", category:"quimicos", name:"Lavandina", presentation:"Bidón x 5 litros", wholesale:3990, retail:4590, image:"img/products/lavandina-5l.webp", tags:["limpieza","pisos"] }

3) EDITAR CATEGORÍAS
Archivo: data/categorias.js
El id de categoría debe coincidir con el campo category de productos.js.

4) EDITAR PREGUNTAS DEL ASISTENTE
Archivo: data/preguntas.js
Las preguntas y respuestas se pueden cambiar desde ahí.
Las tags conectan respuestas con productos recomendados.

5) WHATSAPP / DATOS DEL NEGOCIO
Archivo: data/config.js
Ahí se cambia:
- WhatsApp
- dirección
- compra mínima mayorista
- texto de aviso de precios

6) IMÁGENES
Carpeta: img/products/
Usar imágenes .webp para que cargue rápido.
Medida recomendada: 600x600 px, fondo blanco o transparente.
El nombre del archivo debe coincidir con la ruta del producto.

7) FUNCIONAMIENTO
- Primero se muestra una pantalla mobile con inicio del asistente.
- El cliente responde una pregunta por pantalla.
- Luego puede enviar datos por WhatsApp, ver recomendados o ver catálogo completo.
- En catálogo puede sumar/restar cantidades.
- La lista se envía por WhatsApp sin calcular total.
- Los precios se muestran como orientativos.
