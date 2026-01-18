# Prompt Studio

Editor dinámico de prompts con sistema de colores parametrizables. Funciona en cualquier dispositivo.

![Vue 3](https://img.shields.io/badge/Vue-3.5.26-brightgreen)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF)
![Responsive](https://img.shields.io/badge/Responsive-Mobile%20%26%20Desktop-blue)

## ✨ Características

*   **Colores Dinámicos:** Usa `{color}` o `{color:nombre}`. Tabs generados automáticamente.
*   **Editor en Tiempo Real:** Escribe, edita y previsualiza prompts con resaltado de sintaxis.
*   **Gestión de Tareas:** Guarda, duplica, exporta/importa configuraciones.

## 🚀 Instalación

```bash
npm create vite@latest prompt-studio -- --template vue
cd prompt-studio
npm install
npx vite
```

## 📖 Uso

1.  **Define Slots de Color:**
    *   `{color}`: Crea "Color 1", "Color 2", etc.
    *   `{color:nombre}`: Slot personalizado.
    *   **Ejemplo:** `Gato {color:pelaje}, ojos {color:ojos}.`
    *   Genera tabs "PELAJE", "OJOS".

2.  **Selecciona Colores:** Haz clic en un tab, elige de la paleta. La vista previa se actualiza. En móvil, usa las tabs inferiores (`⚙️ Configurar`, `👁 Vista Previa`).

3.  **Edita el Prompt:** Modifica el texto directamente.

4.  **Gestiona Tareas:** Iconos para crear, cargar, duplicar, eliminar.

5.  **Exporta/Importa:** Comparte configuraciones como JSON.

## 🎯 Ejemplos

*   **Ejemplo RPG:** `Cabello {color:cabello}, Ojos {color:ojos}`
*   **Ejemplo Paisaje:** `Cielo {color:cielo}, Montañas {color:montañas}`
*   **Ejemplo UI:** `Fondo {color:fondo}, Botones {color:botones}`

## 📁 Proyecto

```
src/
├── components/
├── composables/
├── data/
├── assets/
└── ...
```

## 📦 Exportación JSON

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "id": 1735392000000,
      "name": "Mi Tarea",
      "prompt": "Gato {color:pelaje} con ojos {color:ojos}",
      "colors": { "color_1": "Brown", "color_2": "Green" }
    }
  ]
}
```

## 📄 Licencia

MIT.
