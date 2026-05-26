# Detector de secciones en transcripciones

Web sencilla en Vite para subir archivos `.srt`, `.json` o `.txt` a un webhook de n8n y descargar automaticamente el resultado procesado.

## Requisitos

- Node.js 20 o superior

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raiz del proyecto:

```env
VITE_N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/tu-endpoint
```

3. Usa la Production URL del Webhook de n8n, no la Test URL.

4. Verifica que el workflow de n8n este activo antes de probar la app.

5. Inicia el servidor de desarrollo:

```bash
npm run dev
```

6. Para generar la version de produccion:

```bash
npm run build
```

## Comportamiento

- La app solo envia archivos al webhook configurado en `VITE_N8N_WEBHOOK_URL`.
- Los archivos se mandan mediante `fetch` usando `FormData`.
- Todos los archivos seleccionados se agregan con `formData.append('files', file)`.
- No se define manualmente el header `Content-Type`, para que el navegador agregue el boundary correcto de `multipart/form-data`.
- Si seleccionas varios archivos, todos se envian bajo el mismo campo `files`.
- Si el webhook responde correctamente, la respuesta se trata como `blob` y la descarga comienza automaticamente como `secciones_detectadas.txt`.
- Si `response.ok` es `false`, la app intenta leer `response.text()` y muestra ese mensaje al usuario.
- No se manejan API keys ni credenciales en el frontend.
