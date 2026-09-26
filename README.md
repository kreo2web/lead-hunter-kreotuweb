# Lead Hunter - Kreotuweb.com 🚀
### Sistema Inteligente de Prospección en Google Maps y Outreach Comercial (WhatsApp & Email SMTP)

Herramienta diseñada para **Kreotuweb.com** para encontrar prospectos comerciales en Google Maps, auditar su presencia digital, clasificarlos en un ranking de oportunidad y gestionar mensajes de prospección personalizados mediante **WhatsApp (1-Click directo)** y **Email HTML con servidor SMTP propio**.

---

## 🌟 Características Principales

1. **Búsqueda Automatizada en Google Maps**:
   - Rastreo por Rubro (ej. *Clínicas Dentales, Restaurantes, Abogados, Gimnasios, Inmobiliarias*) y Ciudad/Zona.
   - Extracción de: Nombre comercial, Teléfono, Dirección, Sitio Web, Calificación (estrellas), Número de reseñas y Ficha directa en Maps.
   - Limpieza automática de teléfonos para WhatsApp internacional.
   - Sin costos de API de Google (ejecutado con navegador automatizado Playwright Chromium).

2. **Auditoría Técnica y Algoritmo de Ranking**:
   - 🟢 **Prioridad Alta (95 pts) - Sin Sitio Web**: Prospectos sin página web oficial. Mayor oportunidad de venta para creación de web desde cero y presencia en Google.
   - 🟡 **Prioridad Media (70-85 pts) - Sitio Web Antiguo**: Detecta automáticamente si el sitio no tiene certificado SSL (`http://`), si no está adaptado para móviles (falta de viewport responsive) o si tiene años de copyright viejos. Oportunidad para vender **Rediseño Web**.
   - ⚪ **Prioridad Baja (30 pts) - Sitio Web Moderno**: Sitios activos y seguros. Oportunidad para venta de **Posicionamiento SEO Local y Campañas de Marketing**.

3. **Enriquecedor de Contacto (Web Crawler secundario)**:
   - Extrae correos electrónicos (`info@...`, `contacto@...`, `ventas@...`) desde la web del cliente y páginas de contacto.
   - Extrae perfiles de redes sociales: **Instagram, Facebook, LinkedIn, TikTok y Twitter/X**.

4. **Outreach por WhatsApp (1-Click Seguro)**:
   - Botón directo que abre la conversación en WhatsApp Web o la App oficial con el mensaje listo para enviar.
   - Cero riesgo de bloqueo (no usa bots automáticos no autorizados).
   - Plantillas pre-cargadas y variables dinámicas: `{nombre_negocio}`, `{ciudad}`, `{rubro}`, `{sitio_web}`, `{diagnostico_web}`, etc.

5. **Outreach por Correo Electrónico (Editor HTML & SMTP)**:
   - Conexión con cualquier servidor SMTP (Gmail, Google Workspace, Zoho, cPanel, Outlook, Amazon SES, etc.).
   - **Editor dual**: Vista previa visual en tiempo real y editor de código HTML para aplicar la identidad visual de Kreotuweb.
   - Sustitución automática de variables en el asunto y cuerpo del mensaje.

6. **Exportación y CRM**:
   - Exportación de prospectos a **Excel (.xlsx)** y **CSV** con un solo clic.
   - Control de estados: *Nuevo, Contactado por WhatsApp, Contactado por Email, Interesado, Cliente Cerrado, Descartado*.
   - Bloc de notas internas por prospecto.
   - Base de datos local SQLite (sin instalaciones complejas).

---

## 💻 Cómo Iniciar la Aplicación Localmente

### Opción Rápida (Servidor Unificado):
Desde la raíz del proyecto (`lead-hunter-kreotuweb`):
```bash
npm start
```
Abre tu navegador en:
👉 **`http://localhost:5000`**

### Modo Desarrollo (con recarga en vivo de React):
```bash
npm run dev:client
```
(Y en otra terminal `npm run dev:server`). La interfaz cargará en `http://localhost:3000`.

---

## ☁️ Publicación en la Nube (Docker)

El proyecto incluye `Dockerfile` y `docker-compose.yml` listos con la imagen oficial de Playwright:
```bash
docker-compose up -d --build
```
La aplicación quedará disponible en el puerto `5000` de tu VPS o servidor en la nube.

---

## 📁 Estructura del Proyecto
```
lead-hunter-kreotuweb/
├── server/
│   ├── src/
│   │   ├── scrapers/
│   │   │   ├── gmapsScraper.ts   # Scraper Google Maps con Playwright
│   │   │   └── webEnricher.ts    # Extractor de emails, redes y auditoría SSL/Responsive
│   │   ├── services/
│   │   │   ├── rankingService.ts # Cálculo de puntuación y ranking
│   │   │   ├── emailService.ts   # Envío SMTP y variables
│   │   │   └── exportService.ts  # Exportación Excel/CSV
│   │   ├── db/
│   │   │   └── database.ts       # SQLite con esquemas y plantillas por defecto
│   │   ├── routes/               # Endpoints REST y Server-Sent Events
│   │   └── index.ts              # Servidor Express
│   └── data/leads.db             # Base de datos persistente
├── client/                       # Frontend React + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/           # Componentes de búsqueda, tabla, filtros y modales
│   │   ├── App.tsx
│   │   └── types.ts
│   └── dist/                     # Build de producción optimizado
├── Dockerfile                    # Contenedor Linux para la nube
├── docker-compose.yml
└── package.json
```
