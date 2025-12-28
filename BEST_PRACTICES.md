# 🎯 Mejores Prácticas y Guía de Desarrollo

## 📋 Tabla de Contenidos
1. [Estructura de Componentes](#estructura-de-componentes)
2. [Composables](#composables)
3. [Gestión de Estado](#gestión-de-estado)
4. [Estilos y Temas](#estilos-y-temas)
5. [Performance](#performance)
6. [Accesibilidad](#accesibilidad)
7. [Testing](#testing)

---

## 🏗️ Estructura de Componentes

### Principios de Diseño

**Single Responsibility Principle (SRP)**
Cada componente debe tener una única responsabilidad:

```vue
<!-- ❌ MAL: Componente que hace demasiado -->
<script setup>
// Maneja colores, temas, exportación, historial...
</script>

<!-- ✅ BIEN: Componentes separados -->
<ColorPalette />
<ThemeToggle />
<ExportImport />
<ConfigHistory />
```

**Composición sobre Herencia**
Usa slots y composables en lugar de extends:

```vue
<!-- ✅ Uso de slots para composición -->
<template>
  <BaseCard>
    <template #header>
      <h2>Título</h2>
    </template>
    <template #content>
      <p>Contenido</p>
    </template>
  </BaseCard>
</template>
```

### Organización de `<script setup>`

```vue
<script setup>
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import { useColorConfig } from '@/composables/useColorConfig'

// 2. Props y Emits
const props = defineProps({
  modelValue: String
})
const emit = defineEmits(['update:modelValue'])

// 3. Composables
const { selections, updateColor } = useColorConfig()

// 4. Estado Reactivo
const isActive = ref(false)
const filteredItems = computed(() => {
  // ...
})

// 5. Métodos
const handleClick = () => {
  // ...
}

// 6. Lifecycle Hooks
onMounted(() => {
  // ...
})

// 7. Expose (si es necesario)
defineExpose({ handleClick })
</script>
```

---

## 🎣 Composables

### Cuándo Crear un Composable

Crea un composable cuando:
- La lógica se reutiliza en múltiples componentes
- La lógica es compleja y merece estar separada
- Quieres testear la lógica de forma aislada

```javascript
// ✅ BIEN: Lógica reutilizable
export function useColorConfig() {
  const selections = reactive({ 1: 'Red', 2: 'Blue', 3: 'Green' })
  
  const updateColor = (slot, color) => {
    selections[slot] = color
  }
  
  return { selections, updateColor }
}
```

### Convenciones de Nomenclatura

```javascript
// ✅ Usa el prefijo "use"
useColorConfig()
useTheme()
useExport()

// ✅ Retorna objetos con nombres descriptivos
return {
  isDark,           // Estado
  toggleTheme,      // Acción
  currentTheme      // Computed
}
```

### Composables con Side Effects

```javascript
export function useStorage() {
  // Auto-guardar con watch
  const watchAndSave = (source) => {
    watch(source, (newValue) => {
      localStorage.setItem(KEY, JSON.stringify(newValue))
    }, { deep: true })
  }
  
  // Cleanup automático
  onUnmounted(() => {
    // Limpiar listeners si es necesario
  })
  
  return { watchAndSave }
}
```

---

## 🎨 Gestión de Estado

### Estado Local vs Global

**Estado Local (ref/reactive)**
```vue
<script setup>
// ✅ Para estado que solo usa un componente
const isOpen = ref(false)
const searchQuery = ref('')
</script>
```

**Estado Compartido (Composables)**
```javascript
// ✅ Para estado compartido entre componentes
export function useColorConfig() {
  const selections = reactive({ 1: 'Red', 2: 'Blue' })
  return { selections }
}
```

### Reactividad Profunda

```javascript
// ✅ reactive para objetos con múltiples propiedades
const user = reactive({
  name: 'John',
  preferences: { theme: 'dark' }
})

// ✅ ref para valores primitivos
const count = ref(0)
const isActive = ref(false)

// ⚠️ Cuidado con desestructurar reactive
const { name } = user // ❌ Pierde reactividad
const name = toRef(user, 'name') // ✅ Mantiene reactividad
```

---

## 🌈 Estilos y Temas

### Variables CSS

```css
/* ✅ Organiza variables por categoría */
:root {
  /* Colors */
  --accent: #0071e3;
  --accent-hover: #0077ed;
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f7;
  
  /* Text */
  --text-primary: #1d1d1f;
  --text-secondary: #86868b;
  
  /* Effects */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.1);
}
```

### Tema Oscuro

```css
/* ✅ Sobrescribe las mismas variables */
.dark-theme {
  --accent: #0a84ff;
  --bg-primary: #000000;
  --text-primary: #f5f5f7;
}

/* ✅ Los componentes usan las variables */
.button {
  background: var(--accent);
  color: var(--text-primary);
}
```

### Scoped Styles

```vue
<style scoped>
/* ✅ Estilos scoped para el componente */
.button {
  padding: 12px 24px;
}

/* ✅ Usa :deep() para estilos hijos */
:deep(.child-component) {
  margin-top: 16px;
}

/* ✅ Usa :global() para estilos globales */
:global(body.loading) {
  cursor: wait;
}
</style>
```

---

## ⚡ Performance

### Computed vs Methods

```vue
<script setup>
// ✅ computed se cachea, recalcula solo si cambian dependencias
const filteredColors = computed(() => {
  return colors.filter(c => c.includes(searchQuery.value))
})

// ❌ method se ejecuta en cada render
const getFilteredColors = () => {
  return colors.filter(c => c.includes(searchQuery.value))
}
</script>

<template>
  <!-- ✅ BIEN -->
  <div v-for="color in filteredColors" :key="color">
  
  <!-- ❌ MAL: Se ejecuta en cada render -->
  <div v-for="color in getFilteredColors()" :key="color">
</template>
```

### v-if vs v-show

```vue
<template>
  <!-- ✅ v-if: para contenido que rara vez cambia -->
  <ExpensiveComponent v-if="shouldRender" />
  
  <!-- ✅ v-show: para contenido que se alterna frecuentemente -->
  <Modal v-show="isOpen" />
</template>
```

### Lazy Loading de Componentes

```javascript
// ✅ Importación dinámica para code splitting
const ConfigHistory = defineAsyncComponent(() => 
  import('./components/ConfigHistory.vue')
)

// ✅ Con loading component
const ConfigHistory = defineAsyncComponent({
  loader: () => import('./components/ConfigHistory.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})
```

---

## ♿ Accesibilidad

### Atributos ARIA

```vue
<template>
  <!-- ✅ Usa atributos ARIA apropiados -->
  <button
    aria-label="Cambiar tema"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <svg aria-hidden="true">...</svg>
  </button>
  
  <!-- ✅ Usa role cuando sea necesario -->
  <div role="dialog" aria-modal="true">
    <h2 id="dialog-title">Título</h2>
    <div aria-labelledby="dialog-title">
      Contenido
    </div>
  </div>
</template>
```

### Navegación por Teclado

```vue
<script setup>
const handleKeydown = (e) => {
  // ✅ Soporta Escape para cerrar
  if (e.key === 'Escape') {
    closeModal()
  }
  
  // ✅ Soporta Enter para confirmar
  if (e.key === 'Enter') {
    submitForm()
  }
}
</script>

<template>
  <div
    @keydown="handleKeydown"
    tabindex="0"
  >
    <!-- ... -->
  </div>
</template>
```

### Focus Management

```vue
<script setup>
import { ref, nextTick } from 'vue'

const inputRef = ref(null)

const openModal = async () => {
  isOpen.value = true
  await nextTick()
  inputRef.value?.focus() // ✅ Enfoca al abrir
}
</script>

<template>
  <input ref="inputRef" />
</template>
```

---

## 🧪 Testing

### Estructura de Tests

```javascript
import { mount } from '@vue/test-utils'
import ColorPalette from '@/components/ColorPalette.vue'

describe('ColorPalette', () => {
  it('renders all colors', () => {
    const wrapper = mount(ColorPalette)
    expect(wrapper.findAll('.color-btn')).toHaveLength(140)
  })
  
  it('filters colors based on search', async () => {
    const wrapper = mount(ColorPalette)
    await wrapper.find('.search-input').setValue('red')
    expect(wrapper.findAll('.color-btn').length).toBeLessThan(140)
  })
  
  it('emits color-selected event on click', async () => {
    const wrapper = mount(ColorPalette)
    await wrapper.find('.color-btn').trigger('click')
    expect(wrapper.emitted('color-selected')).toBeTruthy()
  })
})
```

### Testing Composables

```javascript
import { useColorConfig } from '@/composables/useColorConfig'

describe('useColorConfig', () => {
  it('initializes with default colors', () => {
    const { selections } = useColorConfig()
    expect(selections[1]).toBe('SlateGray')
  })
  
  it('updates color for active slot', () => {
    const { selections, activeSlot, updateColor } = useColorConfig()
    activeSlot.value = 2
    updateColor('Blue')
    expect(selections[2]).toBe('Blue')
  })
})
```

---

## 📝 Convenciones de Código

### Nombres de Archivos

```
✅ BIEN:
- ColorPalette.vue
- useColorConfig.js
- colors.js

❌ MAL:
- colorpalette.vue
- UseColorConfig.js
- Colors.JS
```

### Orden de Props

```vue
<script setup>
defineProps({
  // 1. Required props primero
  modelValue: {
    type: String,
    required: true
  },
  
  // 2. Props con default después
  size: {
    type: String,
    default: 'medium'
  },
  
  // 3. Props opcionales al final
  disabled: Boolean
})
</script>
```

### Comentarios Útiles

```javascript
// ✅ Explica el "por qué", no el "qué"
// Usamos setTimeout para evitar race condition con el DOM
setTimeout(() => {
  inputRef.value?.focus()
}, 0)

// ❌ No explica nada útil
// Establece el valor a 0
const count = 0
```

---

## 🚀 Deployment

### Build Optimization

```javascript
// vite.config.js
export default defineConfig({
  build: {
    // ✅ Minificación
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true // Remueve console.logs
      }
    },
    
    // ✅ Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'utils': ['./src/composables']
        }
      }
    }
  }
})
```

### Environment Variables

```javascript
// .env.production
VITE_API_URL=https://api.production.com
VITE_APP_TITLE=Prompt Studio

// uso en código
const apiUrl = import.meta.env.VITE_API_URL
```

---

## 📚 Recursos Adicionales

- [Vue 3 Docs](https://vuejs.org/)
- [Vite Docs](https://vitejs.dev/)
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Vue Style Guide](https://vuejs.org/style-guide/)

---

**Happy Coding! 🎉**
