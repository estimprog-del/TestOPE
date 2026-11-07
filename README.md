# TestOPE Web

Aplicación web progresiva TestOPE. La aplicación, sus pruebas y sus ocho baterías están en este repositorio; no requiere Android Studio.

## Ejecutarla en local

No abras `index.html` con doble clic: `file://` impide que el navegador cargue las baterías y active el modo sin conexión. Instala Node.js 22 o posterior y, desde la carpeta del proyecto, ejecuta:

```powershell
npm run start
```

Abre <http://localhost:4173/>. El comando prepara `dist/` desde los archivos de esta carpeta y sirve la web en local.

Para comprobar cambios y generar la versión publicable:

```powershell
npm test
npm run build
```

Las baterías de preguntas están en `data/`.

## Publicarla

El workflow `.github/workflows/deploy-web.yml` ejecuta las pruebas, construye la web y publica `dist/` en GitHub Pages cada vez que se actualiza el repositorio. Sube esta carpeta como raíz de un repositorio de GitHub, abre **Settings → Pages**, selecciona **GitHub Actions** como *Build and deployment source* y espera a que termine el workflow.

La URL será `https://USUARIO.github.io/REPOSITORIO/`.

Los resultados y fallos se almacenan solo en el navegador mediante `localStorage`; no hay cuentas, servidor ni sincronización entre dispositivos. Borrar los datos del sitio también elimina ese historial.

Desde la pantalla principal puedes exportar e importar una copia JSON de resultados, fallos, progreso y claves corregidas. Importar reemplaza los datos locales actuales y solicita confirmación.

Los simulacros permiten escoger una o varias baterías, el número de preguntas y si incluir preguntas sin clave. Cada batería muestra preguntas intentadas, fallos pendientes de repaso y preguntas aún no intentadas. Puedes informar de una posible errata desde una pregunta; se prepara un correo con su contexto y se abre el programa de correo predeterminado.

En cualquier pantalla puedes alternar entre tema claro, oscuro y sepia, y ajustar el tamaño de lectura con **A− / A+**. Durante un test puedes responder con **A, B, C, D** o **1, 2, 3, 4**; los atajos no se activan al escribir en campos de texto.

En la primera visita aparece un aviso sobre el estado del proyecto, privacidad y almacenamiento, con el correo de contacto `estimprog@gmail.com`. El aviso no sustituye una política legal completa; revisa qué datos de identificación del responsable son necesarios antes de publicar.

La batería de Oficial/a de Mantenimiento Calefactor-Fontanero/a contiene 200 preguntas. Las 127 respuestas que no aparecen en el cuadro se dejan sin clave; puedes añadir, corregir, quitar o restaurar claves desde **Plantilla**. Los cambios se guardan en este navegador.

## Pruebas

Desde esta carpeta ejecuta:

```powershell
npm test
```
