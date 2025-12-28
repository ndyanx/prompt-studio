# 🎨 Prompt Studio Master - Universal Edition

Editor dinámico de prompts con sistema de colores parametrizables. **Funciona con cualquier prompt en cualquier dispositivo.**

![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF)
![Responsive](https://img.shields.io/badge/Responsive-Mobile%20%26%20Desktop-blue)

## ✨ Características Principales

### 🎯 Sistema de Colores Dinámicos
- **Placeholders inteligentes**: Usa `{color}` o `{color:nombre}` en cualquier prompt
- **Tabs automáticos**: Se generan dinámicamente según tus placeholders
- **Sin límites**: Crea tantos slots de color como necesites
- **140+ colores CSS**: Paleta completa con búsqueda

### 📝 Editor de Prompts
- **Modo edición**: Escribe y modifica tu prompt en tiempo real
- **Vista previa**: Ve cómo se aplican los colores antes y después
- **Sintaxis destacada**: Los placeholders se resaltan automáticamente
- **Estadísticas**: Caracteres, palabras, líneas y colores usados

### 💼 Sistema de Tareas
- **Múltiples prompts**: Guarda diferentes configuraciones
- **Exportar/Importar JSON**: Comparte tus tareas entre dispositivos
- **Duplicar**: Crea variaciones de tus prompts rápidamente
- **Auto-guardado**: Tu trabajo se guarda automáticamente

### 📱 100% Responsive
- **Desktop**: Layout de 2 columnas optimizado
- **Tablet**: Vista adaptada con scroll vertical
- **Mobile**: Navegación con tabs inferior
- **Touch optimizado**: Botones grandes y gestos naturales

### 🌓 Personalización
- **Modo oscuro**: Tema claro y oscuro con detección automática
- **Persistencia**: localStorage para guardar tu trabajo
- **Accesibilidad**: Navegación por teclado y ARIA

## 🚀 Instalación

```bash
# Crear proyecto
npm create vite@latest prompt-studio -- --template vue

# Navegar al directorio
cd prompt-studio

# Instalar dependencias
npm install

# Iniciar servidor
npm run dev
```

## 📖 Uso

### 1. Crear Slots de Color

En tu prompt, usa estos formatos:

```
{color}              → Crea "Color 1", "Color 2", etc.
{color:nombre}       → Crea un slot con nombre personalizado
```

**Ejemplo completo:**
```
Generar un gato color {color:pelaje} con ojos {color:ojos} 
sobre una mesa color {color:mesa} con fondo {color:fondo}
```

Esto genera automáticamente 4 tabs:
- **PELAJE**
- **OJOS**
- **MESA**
- **FONDO**

### 2. Seleccionar Colores

#### Desktop/Tablet
1. Haz clic en un tab de color
2. Selecciona un color de la paleta (izquierda)
3. Ve la vista previa en tiempo real (derecha)

#### Mobile
1. En la tab "⚙️ Configurar":
   - Selecciona el tab de color
   - Elige el color de la paleta
2. Cambia a "👁 Vista Previa" para ver el resultado

### 3. Editar el Prompt

- **Modo Editar**: Modifica el texto del prompt
- **Vista Previa**: Ve los colores aplicados

### 4. Gestionar Tareas

**Crear nueva tarea:**
- Clic en el botón "+" del panel de tareas

**Cargar tarea existente:**
- Abre el panel de tareas (icono de cuadrícula)
- Haz clic en "Cargar"

**Duplicar tarea:**
- Clic en el icono de duplicar
- Edita la copia sin afectar la original

**Eliminar tarea:**
- Clic en el icono de papelera
- (No puedes eliminar si solo tienes 1 tarea)

### 5. Exportar/Importar

**Exportar todas las tareas:**
```
1. Clic en botón "⬇ Exportar"
2. Se descarga: prompt-tasks-[timestamp].json
3. Comparte el archivo con otros dispositivos
```

**Importar tareas:**
```
1. Clic en botón "⬆ Importar"
2. Selecciona un archivo .json
3. Las tareas se agregan a tu lista
```

## 📱 Navegación Mobile

### Tabs Inferiores
- **⚙️ Configurar**: Panel de colores y paleta
- **👁 Vista Previa**: Editor de prompt y resultado

### Gestos
- **Scroll**: Desliza para explorar colores/contenido
- **Tap**: Selecciona colores o cambia de tab
- **Pinch**: Zoom en el editor (si tu navegador lo soporta)

### Optimizaciones Touch
- Botones mínimo 44x44px
- Espaciado ampliado entre elementos
- Scroll suave optimizado
- Safe area para iPhone notch

## 🎯 Ejemplos de Uso

### Diseño de Personaje
```
Crear personaje RPG con:
- Cabello {color:cabello}
- Ojos {color:ojos}
- Piel {color:piel}
- Armadura {color:armadura}
- Capa {color:capa}
```

### Paisaje
```
Paisaje fantástico con:
- Cielo {color:cielo}
- Montañas {color:montañas}
- Bosque {color:bosque}
- Río {color:rio}
- Castillo {color:castillo}
```

### UI Design
```
Diseño de app móvil:
- Fondo {color:fondo}
- Barra navegación {color:navbar}
- Botones primarios {color:botones}
- Texto {color:texto}
- Acentos {color:acentos}
```

### Arte Abstracto
```
Composición abstracta:
- Color dominante {color:principal}
- Secundario {color:secundario}
- Acentos {color:acento1}
- Contraste {color:contraste}
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ColorPalette.vue       # Grid de 140+ colores
│   ├── ColorTabs.vue          # Tabs dinámicos generados
│   ├── ConfigPanel.vue        # Panel de configuración
│   ├── PreviewPanel.vue       # Editor + Vista previa
│   ├── TasksPanel.vue         # Gestor de tareas
│   ├── ThemeToggle.vue        # Toggle tema claro/oscuro
│   └── MobileTabBar.vue       # Navegación mobile
├── composables/
│   ├── usePromptManager.js    # Lógica de prompts y tareas
│   └── useTheme.js            # Gestión de temas
├── data/
│   └── colors.js              # Paleta de colores CSS
├── assets/
│   └── styles/
│       └── main.css           # Estilos globales + responsive
├── App.vue                    # Componente raíz
└── main.js                    # Entry point
```

## 🔧 Comandos NPM

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Limpiar cache y reinstalar
rm -rf node_modules .vite
npm install
```

## 📦 Formato de Exportación JSON

```json
{
  "version": "2.0.0",
  "exportedAt": "2024-12-28T12:00:00.000Z",
  "tasks": [
    {
      "id": 1735392000000,
      "name": "Mi Tarea",
      "prompt": "Gato {color:pelaje} con ojos {color:ojos}",
      "colors": {
        "color_1": "Brown",
        "color_2": "Green"
      },
      "createdAt": "2024-12-28T12:00:00.000Z",
      "updatedAt": "2024-12-28T12:05:00.000Z"
    }
  ]
}
```

## 💡 Tips y Trucos

### Nomenclatura de Colores
- ✅ `{color:pelaje_gato}` - Descriptivo
- ✅ `{color:primario}` - Categorías
- ❌ `{color:1}` - Poco claro

### Organización de Tareas
- Crea una tarea base y duplícala para variaciones
- Usa nombres descriptivos: "Personaje Elfo - Versión Oscura"
- Exporta backups semanalmente

### Búsqueda de Colores
- Escribe "dark" para oscuros
- Escribe "light" para claros
- Escribe "blue", "red", etc. para familias

### Workflow Recomendado
1. Escribe el prompt completo
2. Define todos los placeholders
3. Ajusta colores uno por uno
4. Duplica y experimenta variaciones
5. Exporta las mejores versiones

## 🌐 Compatibilidad de Navegadores

| Navegador | Desktop | Mobile |
|-----------|---------|--------|
| Chrome    | ✅ 90+  | ✅ 90+ |
| Firefox   | ✅ 88+  | ✅ 88+ |
| Safari    | ✅ 14+  | ✅ 14+ |
| Edge      | ✅ 90+  | ✅ 90+ |

## 📱 Breakpoints Responsive

```css
Desktop:  > 1024px  → Layout 2 columnas
Tablet:   768-1024px → Scroll vertical
Mobile:   < 768px   → Tab navigation
Small:    < 480px   → Optimizaciones extra
```

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Tab` | Navegar entre campos |
| `Esc` | Cerrar paneles |
| `Ctrl/Cmd + S` | Auto-guarda (siempre activo) |

## 🎨 Temas

### Modo Claro
- Fondo blanco limpio
- Contraste alto para lectura
- Colores vibrantes en paleta

### Modo Oscuro
- Fondo negro puro (#000)
- Reducción de fatiga visual
- Acentos brillantes

**Toggle:** Botón 🌙/☀️ en esquina superior derecha

## 🔐 Privacidad

- ✅ Todo se guarda localmente en tu navegador
- ✅ No hay servidores ni tracking
- ✅ Tus prompts son 100% privados
- ✅ Exporta para respaldar tus datos

## 🐛 Solución de Problemas

**Los colores no cambian:**
- Asegúrate de seleccionar un tab primero
- Verifica que el placeholder esté bien escrito

**No veo mis tareas:**
- Revisa localStorage en DevTools
- Intenta importar desde un backup JSON

**Mobile: Panel cortado:**
- Actualiza a la última versión
- Prueba en modo portrait

**Exportar no funciona:**
- Verifica permisos de descarga del navegador
- Intenta en modo incógnito

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcion`
3. Commit: `git commit -m 'Agrega nueva función'`
4. Push: `git push origin feature/nueva-funcion`
5. Abre un Pull Request

## 📄 Licencia

MIT License - Uso libre para proyectos personales y comerciales

## 🙏 Créditos

- **Vue.js Team** - Framework reactivo
- **Vite** - Build tool ultrarrápido
- **Lucide Icons** - Iconografía
- **Apple Design** - Inspiración UI/UX

## 📞 Soporte

¿Problemas o sugerencias?
- Abre un [Issue](https://github.com/tu-usuario/prompt-studio/issues)
- Revisa la [Wiki](https://github.com/tu-usuario/prompt-studio/wiki)
- Únete al [Discord](#) (próximamente)

---

**Hecho con ❤️ usando Vue 3 + Vite**

⭐ Si te gusta el proyecto, ¡dale una estrella en GitHub!
