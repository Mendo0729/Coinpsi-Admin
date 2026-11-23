# COINPSI Admin

Panel administrativo de COINPSI desarrollado con HTML, CSS y JavaScript modular.

## Dependencias

**No requiere paquetes externos de npm**. Su publicación en Render es un **sitio estático**: el comando de build (`node scripts/build-static.js`) utiliza únicamente módulos integrados de Node.js.

Para el desarrollo local se conserva un servidor basado en `node:http` y `node:fs`, sin Express. Se mantiene la configuración dinámica `/runtime-config.js` y el soporte de rutas SPA.

## Comandos

- `npm ci`: valida el archivo de bloqueo sin descargar paquetes externos.
- `npm run build`: genera `dist/` para Render.
- `npm start`: inicia el servidor HTTP local en el puerto 3001.
- `npm run dev`: inicia el servidor con las variables de `.env.development`.
- `npm test`: ejecuta las pruebas del servidor local.
- `npm audit`: comprueba las dependencias registradas.

Para desplegar en Render se mantiene `npm ci && npm run build`, con directorio de publicación `dist`. La URL de Coinpsi-API se define mediante `API_BASE_URL` (por defecto `https://coinpsi-api.mendotech.lat` en el build).
