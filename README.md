# Lead Hunter - Kreotuweb.com 🚀
### Sistema Inteligente de Prospección en Google Maps, Redes Sociales y Outreach con WhatsApp IA & Email SMTP

Plataforma integral diseñada para **Kreotuweb.com** para encontrar prospectos comerciales en Google Maps y redes sociales, auditar su presencia digital, enriquecer automáticamente sus datos de contacto y gestionar el outreach comercial mediante **Email HTML SMTP** y un **Robot de WhatsApp con Inteligencia Artificial (sin API de Meta)** entrenado con la información de tu negocio.

---

## 🌟 Nuevas Funcionalidades y Mejoras Recientes

### 1. 🤖 Robot de WhatsApp con IA (Sin API de Meta - Conexión por Código QR)
- **Vinculación instantánea en 5 segundos**: Se conecta mediante emulación de WhatsApp Web (`@whiskeysockets/baileys`). Escaneas el código QR desde tu teléfono (*Dispositivos vinculados*) y listo.
- **Sin costos por mensaje ni aprobaciones**: Cero tarifas de Meta Cloud API, sin necesidad de verificar empresa ni aprobación previa de plantillas.
- **Entrenamiento con la información de tu Negocio**:
  - Personalidad y nombre del asistente virtual (ej. *Laura de Kreotuweb*).
  - Contexto de la empresa: propuesta de valor, descripción de servicios, rangos de precios y enlaces para agendar llamadas o videollamadas.
  - **Preguntas Frecuentes (FAQs)**: Tabla interactiva para configurar pares de preguntas comunes y respuestas autorizadas que la IA respetará fielmente.
- **Motor de Inteligencia Artificial Dual**:
  - **Google Gemini Flash** (rápido, inteligente y con API Key gratuita vía Google AI Studio).
  - **OpenAI (GPT-4o mini)**.
- **Simulador de Pruebas en Vivo**: Consola de chat integrada para probar cómo responderá el robot antes de activarlo con clientes reales.
- **Seguimiento Automatizado**: Cuando un prospecto responde un mensaje por WhatsApp, el robot le responde en tiempo real.
- **Control Individual por Chat**: Posibilidad de pausar o reactivar el robot para cualquier conversación individual.

### 2. 🔍 Búsqueda y Enriquecimiento de Contacto en Redes Sociales (Facebook e Instagram)
- **Rastreo automático si falta en Google Maps**: Si un prospecto no tiene teléfono o correo registrado en Google Maps, el sistema rastrea automáticamente sus perfiles comerciales en Facebook e Instagram (`site:facebook.com` / `site:instagram.com`).
- **Extracción de datos**: Extrae correos electrónicos y teléfonos de contacto/WhatsApp de la biografía, descripciones y secciones de información de las redes.
- **Búsqueda bajo demanda**: Botón *"Buscar Contacto en Redes"* en el detalle de cada prospecto para enriquecer datos en cualquier momento.
- **Soporte de Cookies de Sesión**: Panel en Ajustes para ingresar cookies opcionales de Facebook e Instagram y evitar bloqueos en perfiles cerrados.

### 3. 👥 Arquitectura Multi-Usuario con Aislamiento Estricto
- **Usuarios y Clientes independientes**: Cada usuario registrado cuenta con su propia lista privada de prospectos, sus búsquedas, sus plantillas y sus credenciales SMTP.
- **Panel de Administración**: Los administradores pueden crear nuevos usuarios, restablecer contraseñas, auditarlos y consultar estadísticas globales o por cliente.
- **Corrección de Envío SMTP**: Autenticación Bearer protegida en todos los endpoints de envío y sustitución de variables basada en el perfil del usuario activo.

---

## 📋 Características Principales

1. **Búsqueda Automatizada en Google Maps**:
   - Rastreo por Rubro (ej. *Clínicas Dentales, Restaurantes, Abogados, Gimnasios, Inmobiliarias*) y Ciudad/Zona.
   - Extracción de Nombre comercial, Teléfono, Dirección, Sitio Web, Calificación (estrellas), Número de reseñas y Ficha directa en Maps.
   - Limpieza automática de teléfonos para WhatsApp internacional.
   - Sin costos de API de Google (ejecutado con navegador automatizado Playwright Chromium).

2. **Auditoría Técnica y Algoritmo de Ranking**:
   - 🟢 **Prioridad Alta (95 pts) - Sin Sitio Web**: Prospectos sin página web oficial o con redes sociales usadas como web. Mayor oportunidad de venta para creación de web desde cero.
   - 🟡 **Prioridad Media (70-85 pts) - Sitio Web Antiguo**: Detecta sitios sin SSL (`http://`), sin diseño adaptado a móviles (falta de viewport responsive) o con años de copyright desactualizados. Oportunidad para **Rediseño Web**.
   - ⚪ **Prioridad Baja (30 pts) - Sitio Web Moderno**: Sitios activos y seguros. Oportunidad para **SEO Local y Marketing Digital**.

3. **Outreach por Correo Electrónico (Editor HTML & SMTP)**:
   - Conexión con cualquier servidor SMTP (Gmail, Google Workspace, Zoho, cPanel, Outlook, Amazon SES, etc.).
   - Editor dual: Vista previa visual en tiempo real y editor de código HTML personalizable.
   - Sustitución automática de variables: `{nombre_negocio}`, `{ciudad}`, `{rubro}`, `{sitio_web}`, `{diagnostico_web}`, etc.

4. **Exportación y CRM**:
   - Exportación de prospectos a **Excel (.xlsx)** y **CSV** con un solo clic.
   - Control de estados: *Nuevo, Contactado por WhatsApp, Contactado por Email, Interesado, Cliente Cerrado, Descartado*.
   - Bloc de notas internas por prospecto.
   - Base de datos local SQLite (`leads.db`) con soporte para migraciones automáticas.

---

## 💻 Cómo Iniciar la Aplicación Localmente

### Opción Rápida (Recomendada):
En Windows, haz doble clic en:
👉 **`iniciar.bat`**  
*(O ejecuta `npm start` desde la terminal).*

Abre tu navegador en:
👉 **`http://localhost:5000`**

Para apagar la aplicación, haz doble clic en **`apagar.bat`**.

---

## 📁 Estructura del Proyecto

```
lead-hunter-kreotuweb/
├── server/
│   ├── src/
│   │   ├── scrapers/
│   │   │   ├── gmapsScraper.ts     # Scraper Google Maps con Playwright
│   │   │   ├── webEnricher.ts      # Extractor de emails y auditoría web
│   │   │   └── socialEnricher.ts   # Búsqueda profunda en Facebook e Instagram
│   │   ├── services/
│   │   │   ├── whatsappService.ts  # Conexión WhatsApp Web vía Baileys
│   │   │   ├── aiAgentService.ts   # Motor de IA (Google Gemini & OpenAI)
│   │   │   ├── rankingService.ts   # Algoritmo de puntuación de oportunidades
│   │   │   ├── emailService.ts     # Envío SMTP multi-usuario
│   │   │   └── exportService.ts    # Exportación a Excel/CSV
│   │   ├── db/
│   │   │   └── database.ts         # SQLite con migraciones y datos iniciales
│   │   ├── routes/                 # Rutas REST (auth, users, leads, whatsapp, settings)
│   │   └── index.ts                # Servidor Express
│   └── data/                       # Base de datos SQLite y sesiones de WhatsApp
├── client/                         # Frontend React + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── WhatsAppBotManager.tsx # Panel de control del Robot IA y QR
│   │   │   ├── LeadDetailModal.tsx    # Detalle del lead y búsqueda en redes
│   │   │   ├── SettingsModal.tsx      # Ajustes de perfil, SMTP y cookies sociales
│   │   │   ├── UsersManager.tsx       # Gestión de usuarios (Admin)
│   │   │   ├── SearchPanel.tsx        # Búsqueda en Google Maps
│   │   │   ├── LeadsTable.tsx         # Tabla interactiva con filtros
│   │   │   └── Header.tsx             # Navegación principal
│   │   ├── App.tsx
│   │   └── types.ts
│   └── dist/                       # Build optimizado para producción
├── Dockerfile                      # Contenedor Linux para despliegue en la nube
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🔒 Privacidad y Seguridad
Las credenciales de WhatsApp, claves de API, contraseñas SMTP y bases de datos locales están excluidas del control de versiones mediante el archivo `.gitignore` para garantizar la seguridad de tus datos.
