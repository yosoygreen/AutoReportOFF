# Publicación en GitHub Pages

La aplicación es un sitio estático; no necesita compilación, backend ni secretos.

Fuente de publicación: rama `gh-pages`, carpeta `/ (root)`.
Dirección prevista: https://yosoygreen.github.io/AutoReportOFF/

Si Pages no está activado, en el repositorio abre **Settings → Pages → Build and deployment → Deploy from a branch** y selecciona **gh-pages / (root)**. Guarda y espera al despliegue de GitHub.

Los Excel y CSV elegidos se procesan en el navegador del operador: no se suben al repositorio ni a un backend. Las teselas OSM solo se solicitan cuando se activa el mapa base; Google Maps se abre por acción explícita.

Para actualizar el sitio después de revisar y probar los cambios, sube el commit deseado a `gh-pages` mediante un avance rápido. No uses force push. El archivo `.nojekyll` permite publicar las bibliotecas y carpetas directamente.
