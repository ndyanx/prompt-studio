# 🎨 Prompt Studio Master - Vue 3 Edition

Editor dinámico y moderno para configuración de prompts con paleta de colores interactiva.

![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Características

### 🎯 Funcionalidades Core
- ✅ **Editor de Configuración Dinámico**: Personaliza colores para diferentes elementos
- ✅ **Vista Previa en Tiempo Real**: Ve los cambios al instante
- ✅ **30+ Combinaciones Predefinidas**: Temas como Cyberpunk, Luxury, Gothic, etc.
- ✅ **140+ Colores CSS**: Paleta completa de colores HTML

### 🌟 Funcionalidades Avanzadas
- 💾 **Persistencia Local**: Guarda automáticamente tu configuración
- 🌓 **Modo Oscuro**: Tema claro y oscuro con detección automática
- 📤 **Exportar/Importar**: Guarda y comparte configuraciones en JSON
- 📋 **Copiar al Portapapeles**: Un clic para copiar el prompt
- 🔍 **Búsqueda de Colores**: Encuentra colores rápidamente
- 📊 **Estadísticas**: Ve caracteres, palabras y líneas del prompt

## 🚀 Instalación

```bash
# 1. Crear proyecto con Vite
npm create vite@latest prompt-studio -- --template vue

# 2. Navegar al directorio
cd prompt-studio

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor de desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
prompt-studio/
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── main.css              # Estilos globales + tema oscuro
│   ├── components/
│   │   ├── ColorPalette.vue          # Grid de colores con búsqueda
│   │   ├── ColorTabs.vue             # Tabs para selección de slots
│   │   ├── ConfigPanel.vue           # Panel de configuración
│   │   ├── ExportImport.vue          # Sistema de exportación/importación
│   │   ├── PreviewPanel.vue          # Vista previa con estadísticas
│   │   └── ThemeToggle.vue           # Toggle de tema claro/oscuro
│   ├── composables/
│   │   ├── useColorConfig.js         # Lógica de colores + persistencia
│   │   ├── useExport.js              # Funciones de exportación
│   │   ├── useStorage.js             # Wrapper de localStorage
│   │   └── useTheme.js               # Gestión de temas
│   ├── data/
│   │   ├── colors.js                 # Array de 140+ colores
│   │   └── combinations.js           # 30 combinaciones predefinidas
│   ├── App.vue                       # Componente raíz
│   └── main.js                       # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🎨 Uso

### Seleccionar Colores
1. Haz clic en uno de los 3 tabs (PASTIES, STOCKINGS, NEON)
2. Selecciona un color de la paleta
3. El color se aplica automáticamente al slot activo

### Buscar Colores
- Escribe en el campo de búsqueda para filtrar colores
- Ejemplo: "dark", "light", "blue", etc.

### Aplicar Combinaciones
- Haz clic en "Recomendación ✨" para aplicar un tema aleatorio
- Se mostrarán combinaciones como Cyberpunk, Luxury, Gothic, etc.

### Exportar/Importar
- **Exportar Config (JSON)**: Guarda tu configuración completa
- **Exportar Prompt (TXT)**: Guarda el texto del prompt
- **Importar Config**: Carga una configuración previamente guardada

### Modo Oscuro
- Haz clic en el botón 🌙/☀️ en la esquina superior derecha
- Se adapta automáticamente a la preferencia del sistema

## 🔧 Composables

### `useColorConfig()`
Gestiona el estado de los colores y la persistencia.

```javascript
const {
  activeSlot,        // Slot activo (1, 2 o 3)
  selections,        // Objeto con los colores seleccionados
  setActiveSlot,     // Cambiar slot activo
  updateColor,       // Actualizar color del slot activo
  applyRecommendation, // Aplicar combinación aleatoria
  resetAll,          // Resetear a valores por defecto
  loadConfig         // Cargar configuración
} = useColorConfig()
```

### `useTheme()`
Gestiona el tema claro/oscuro.

```javascript
const {
  isDark,      // Boolean del estado actual
  toggleTheme  // Función para cambiar tema
} = useTheme()
```

### `useExport()`
Maneja exportación e importación de archivos.

```javascript
const {
  exportAsJSON,     // Exportar como JSON
  exportAsText,     // Exportar como TXT
  importFromJSON,   // Importar desde JSON
  copyToClipboard   // Copiar al portapapeles
} = useExport()
```

### `useStorage()`
Wrapper de localStorage con manejo de errores.

```javascript
const {
  saveToStorage,    // Guardar datos
  loadFromStorage,  // Cargar datos
  clearStorage,     // Limpiar datos
  watchAndSave      // Auto-guardar con watch
} = useStorage()
```

## 🎯 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🌈 Personalización

### Agregar Nuevas Combinaciones
Edita `src/data/combinations.js`:

```javascript
export const combinations = [
  // ...
  { 
    name: "Mi Tema", 
    c: { 
      1: "Color1", 
      2: "Color2", 
      3: "Color3" 
    } 
  }
]
```

### Modificar Colores
Edita `src/data/colors.js` para agregar o quitar colores CSS.

### Personalizar Estilos
Variables CSS en `src/assets/styles/main.css`:

```css
:root {
  --accent: #0071e3;           /* Color principal */
  --bg-primary: #ffffff;       /* Fondo principal */
  /* ... más variables ... */
}

.dark-theme {
  --accent: #0a84ff;           /* Color principal oscuro */
  --bg-primary: #000000;       /* Fondo oscuro */
  /* ... más variables ... */
}
```

## 🔐 Persistencia de Datos

Los datos se guardan automáticamente en `localStorage`:
- **Key**: `prompt-studio-config`
- **Formato**: JSON con selecciones y timestamp
- **Auto-save**: Se activa con cada cambio

## 📱 Responsive

- Desktop: Layout de 2 columnas (60/40)
- Tablet: Layout apilado vertical
- Mobile: Optimizado para pantallas pequeñas

## 🎨 Temas

### Modo Claro
- Colores inspirados en Apple Design
- Alto contraste para legibilidad
- Sombras sutiles

### Modo Oscuro
- Negro puro (#000) como base
- Acentos vibrantes
- Reduce fatiga visual

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ve el archivo [LICENSE](LICENSE) para más detalles

## 🙏 Agradecimientos

- Vue.js Team por el increíble framework
- Vite por el blazing fast build tool
- Apple Design para la inspiración visual

## 📞 Soporte

¿Problemas o preguntas? Abre un [issue](https://github.com/tuusuario/prompt-studio/issues)

---

Hecho con ❤️ usando Vue 3 + Vite
