# REGICAP — Sistema de Registro Inteligente para Capacitaciones

Mockup funcional de una **plataforma de capacitaciones con evaluación asistida por IA**, pensada para programas de capacitación de emprendimiento con proveedores externos (cámaras de comercio, bancos, universidades, programas gubernamentales).

> **Es un mockup**: no tiene backend. Todos los datos viven en el navegador (`localStorage`) a partir de una base de datos semilla, y la "Inteligencia Artificial" que califica las respuestas está **simulada** de forma determinística en el cliente.

Sitio **100% estático** (HTML + CSS + JavaScript vanilla, sin framework ni build) — listo para desplegar en Vercel sin configuración.

---

## 🎭 Roles y accesos

Todo arranca en el login ([`index.html`](index.html)). Elige un rol (el correo se autocompleta) y pulsa **Ingresar** — no hay validación de contraseña, es una demo.

| Rol | Portal | Qué hace |
|---|---|---|
| **Administrador** | `admin.html` | Consulta resultados generales y, al hacer clic en un participante, ve su **análisis individual**; entrega feedback. |
| **Participante** | `participante.html` | Administra sus inscripciones, **toma capacitaciones** (contenido en PDF, texto y video + tests) y **recibe feedback** sobre su resultado final. |
| **Empresa** | `empresa.html` | Crea capacitaciones, módulos y actividades (adjunta PDF, escribe lecturas con editor de texto enriquecido, enlaza videos de YouTube) y arma los tests. |

### 🌐 Curso de muestra
Incluye una capacitación real de ejemplo: **Fundamentos de Redes** (Universidad Tecnológica de Panamá), con 3 módulos (IP, Switch, Router), material en PDF, videos de YouTube, lecturas y una **evaluación final** que reúne los cuestionarios de todos los módulos.

---

## 🚀 Desplegar en Vercel

El proyecto no necesita build. Dos formas:

**A) Desde un repositorio Git**
1. Sube este directorio a un repositorio (GitHub / GitLab / Bitbucket).
2. En Vercel: **Add New → Project** e importa el repo.
3. **Framework Preset:** `Other`. **Build Command:** vacío. **Output Directory:** vacío (raíz).
4. **Deploy**. El [`vercel.json`](vercel.json) activa `cleanUrls` (URLs sin `.html`, p. ej. `/admin`).

**B) Sin Git (CLI)**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # producción
```

---

## 💻 Ejecutar en local

Es estático, pero conviene servirlo por HTTP (para que el visor de PDF `<embed>` y las rutas relativas funcionen igual que en producción):

```bash
# opción 1 — Python
python3 -m http.server 5173

# opción 2 — Node
npx serve .
```

Luego abre `http://localhost:5173`. (También puedes abrir `index.html` directamente con doble clic, pero un servidor local reproduce mejor el comportamiento real.)

---

## 🗂️ Estructura

```
├── index.html              # Login (selección de rol)
├── admin.html              # Portal Administrador
├── participante.html       # Portal Participante
├── empresa.html            # Portal Empresa
├── assets/
│   ├── css/styles.css      # Estilos (un solo archivo, con modo claro)
│   ├── js/
│   │   ├── data.js         # Base de datos semilla (SEED_DATA)
│   │   ├── store.js        # Persistencia (localStorage) + queries + IA simulada
│   │   ├── ui.js           # Shell (sidebar + topbar) y componentes de render compartidos
│   │   ├── admin.screens.js        # Pantallas del Administrador
│   │   ├── participante.screens.js # Pantallas del Participante
│   │   └── empresa.screens.js      # Pantallas de la Empresa
│   └── pdfs/               # PDFs de ejemplo del curso de Redes
├── vercel.json             # cleanUrls
├── context.md              # Especificación funcional (casos de uso, cálculos de IA)
└── DATA_MODEL.md           # Modelo de datos
```

---

## 🧠 Datos y reinicio

- La base se **siembra una sola vez** en `localStorage` (clave `regicap_db`) a partir de `SEED_DATA` en [`assets/js/data.js`](assets/js/data.js).
- La sesión activa se guarda en `sessionStorage`.
- Para volver a la base original (por ejemplo tras probar la app o al actualizar los datos semilla), en la consola del navegador ejecuta:
  ```js
  resetDemo()
  ```
  o borra el almacenamiento del sitio (DevTools → Application → Local Storage).

---

## ⚙️ Detalles técnicos (mockup)

- **Sin dependencias ni build**: HTML/CSS/JS vanilla. Cada portal carga solo su `*.screens.js`.
- **IA simulada**: `simularCalificacionIA()` en `store.js` implementa cálculos deterministas por tipo de pregunta (simple, texto libre, cuantitativa, cualitativa). No hay NLP real.
- **PDFs**: los del curso semilla viven en `assets/pdfs/`. Los que la Empresa adjunta desde la UI se guardan como *data URL* en `localStorage`, por eso hay un límite de ~3 MB por archivo.
- **Editor de texto enriquecido**: basado en `contenteditable` + `document.execCommand` (negrita, cursiva, listas, cita, enlace).

---

## 📄 Documentación

- [`context.md`](context.md) — especificación funcional completa (actores, casos de uso, fórmulas de calificación de la IA).
- [`DATA_MODEL.md`](DATA_MODEL.md) — entidades y relaciones del modelo de datos.
