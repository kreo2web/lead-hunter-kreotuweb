# Changelog - Lead Hunter Kreotuweb

Todos los cambios notables y mejoras implementadas en la plataforma quedan registrados en este documento.

---

## [v2.0.0] - 2026-10-06

### 🚀 Nuevas Funcionalidades (WhatsApp con IA & Redes Sociales)
- **Robot de WhatsApp sin API de Meta (`@whiskeysockets/baileys`)**:
  - Conexión instantánea mediante escaneo de código QR (emulación de WhatsApp Web).
  - Cero costos por mensaje y sin necesidad de aprobaciones de Facebook/Meta.
  - Almacenamiento y persistencia de sesiones aisladas por usuario en `server/data/wa_sessions/`.
- **Entrenamiento de IA para Atención y Ventas**:
  - Integración nativa con **Google Gemini Flash** (gratuito vía Google AI Studio) y **OpenAI GPT-4o mini**.
  - Panel visual de entrenamiento: nombre del bot, directrices del negocio, propuesta de valor y reglas de conversión.
  - Tabla dinámica de Preguntas Frecuentes (FAQs) con pares de Pregunta y Respuesta autorizada.
  - Simulador de chat interactivo para probar respuestas en tiempo real antes de poner el bot en vivo.
- **Seguimiento Automatizado de Prospectos**:
  - Detección automática de respuestas de prospectos en WhatsApp.
  - Generación de respuestas naturales con retardo simulado para evitar apariencia de spam.
  - Pestaña de historial de chats con opción de pausar o reactivar el robot para cualquier contacto específico.
- **Búsqueda y Enriquecimiento de Contacto en Redes Sociales (`socialEnricher.ts`)**:
  - Rastreo contextual en Facebook e Instagram cuando Google Maps carece de teléfono o correo.
  - Extracción de correos electrónicos y teléfonos de contacto/WhatsApp en biografías y metadatos.
  - Botón "Buscar Contacto en Redes" disponible dentro del modal de detalle de cada prospecto.
  - Configuración de cookies de sesión para Facebook e Instagram en el panel de Ajustes.

### 👥 Arquitectura Multi-Usuario y Seguridad
- **Aislamiento estricto de prospectos por cliente/empresa**:
  - Base de datos migrada a restricción compuesta `UNIQUE(userId, placeId)`.
  - Cada usuario gestiona su propia lista de prospectos, búsquedas, plantillas y servidor SMTP privado.
- **Panel de Administración de Usuarios**:
  - Vista exclusiva para administradores para crear clientes, asignar roles y auditar prospectos.
  - Selector de cuenta para que el admin pueda alternar entre sus prospectos propios, los de cualquier cliente o la vista global.
- **Correcciones de Autenticación y SMTP**:
  - Resuelto el error 401 "Usuario no autenticado" en el modal de envío de correo añadiendo el header `Authorization: Bearer <token>`.
  - Eliminadas las variables estáticas quemadas en el cliente para que el servidor sustituya los datos reales del remitente configurado.

---

## [v1.0.0] - Lanzamiento Inicial
- Búsqueda automatizada en Google Maps con Playwright Chromium sin costo de API.
- Clasificación de prospectos por algoritmo de ranking (Prioridad Alta, Media, Baja).
- Auditoría técnica web básica (SSL, responsivo móvil, copyright).
- Plantillas de mensajes comerciales y sustitución dinámica de variables.
- Envío de emails HTML mediante servidor SMTP.
- Enlace directo de 1-clic a WhatsApp Web.
- Exportación de prospectos a Excel (.xlsx) y CSV.
- Base de datos local SQLite con persistencia.
