# Admin NFC

Este proyecto ahora tiene un panel privado de administracion en `/admin`.

## Que puede hacer el admin

- Iniciar sesion con una contrasena guardada como secreto del Worker.
- Crear nuevas tarjetas NFC sin editar codigo manualmente.
- Consultar el catalogo de ROMs generado desde `public/roms`.
- Generar una llave nueva automaticamente para cada tarjeta.
- Listar tanto las tarjetas incluidas en el proyecto como las creadas desde el panel admin.
- Mantener compatibilidad con las URLs antiguas `/?tag=...` solo para las tarjetas legacy que ya existian.

## Configuracion requerida

Define estos secretos del Worker antes de desplegar:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
```

Valor sugerido para `ADMIN_SESSION_SECRET`: una cadena larga y aleatoria.

## Almacenamiento

- `NFC_REGISTRY` en KV guarda las tarjetas creadas desde el admin.
- Las tarjetas incluidas en `src/nfc-registry.mjs` siguen funcionando como respaldo.
- Los archivos ROM permanecen en `public/roms` dentro del repositorio.
- `public/roms/catalog.json` es el indice de esos ROMs que usa el panel admin.
- Las solicitudes directas a `/roms/*` y `/data/bios/*` quedan bloqueadas por el Worker.
- La entrada publica `/` solo abre cuando la solicitud incluye una `?key=` valida o un `?tag=` legado.
- El emulador ahora lee ROMs y BIOS mediante `/api/asset?...`, asi que las rutas reales de los archivos no se exponen en la respuesta inicial del juego.
- Las tarjetas nuevas creadas desde el admin quedan en modo `secure` y su URL publica principal siempre es `/?key=...`.
- Las tarjetas antiguas incluidas en el proyecto quedan en modo `legacy` y siguen aceptando `/?tag=...`.

## Flujo de ROMs

1. Agrega el archivo ROM dentro de `public/roms/<core>/`.
2. Ejecuta:

```bash
node scripts/build-rom-catalog.mjs
```

3. Haz commit del ROM y del archivo actualizado `public/roms/catalog.json`.
4. Despliega.
5. Abre `/admin` y selecciona ese ROM para la nueva tarjeta NFC.

## Opcion alternativa por CLI

Si prefieres crear una tarjeta desde la terminal, esto sigue funcionando:

```bash
node scripts/create-nfc-card.mjs --tag NES_MARIO_007 --core nes --game roms/NES/mario.nes --base-url https://your-domain.example
```

## Limitacion importante

Esta configuracion hace mucho mas dificil descubrir los ROMs y obliga a entrar al juego mediante una NFC key valida, pero aun asi no evita que una URL final copiada pueda reutilizarse. Para impedir clonaciones de forma realmente fuerte, el hardware NFC tendria que tener soporte criptografico de challenge-response.
