<script setup>
import { ref } from "vue";
import { colors } from "../data/colors";

const props = defineProps({
    activeSlot: String,
    colorSelections: Object,
});

const emit = defineEmits(["update-color"]);

const searchQuery = ref("");

const handleColorClick = (color) => {
    emit("update-color", color);
};

const filteredColors = () => {
    if (!searchQuery.value) return colors;
    const query = searchQuery.value.toLowerCase();
    return colors.filter((color) => color.toLowerCase().includes(query));
};
</script>

<template>
    <div class="palette-section">
        <div class="palette-bar">
            <span>Paleta de Colores</span>
        </div>

        <div class="search-box">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </svg>
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar color..."
                class="search-input"
            />
        </div>

        <div class="scroll-container">
            <div class="color-grid">
                <button
                    v-for="color in filteredColors()"
                    :key="color"
                    :style="{ background: color }"
                    :title="color"
                    @click="handleColorClick(color)"
                    class="color-btn"
                    :class="{ selected: colorSelections[activeSlot] === color }"
                />
            </div>
            <div v-if="filteredColors().length === 0" class="no-results">
                No se encontraron colores
            </div>
        </div>
    </div>
</template>

<style scoped>
.palette-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.palette-bar {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 15px;
    color: var(--text-primary);
}

.search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    margin-bottom: 15px;
    transition: all 0.2s;
}

.search-box:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.search-box svg {
    color: var(--text-secondary);
}

.search-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 13px;
    color: var(--text-primary);
    font-family: inherit;
}

.search-input::placeholder {
    color: var(--text-secondary);
}

.scroll-container {
    flex: 1;
    overflow-y: auto;
    padding-right: 10px;
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
    gap: 8px;
}

.color-btn {
    aspect-ratio: 1;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}

.color-btn:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10;
    border-color: var(--accent);
}

.color-btn.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2);
}

.color-btn.selected::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 20px;
    font-weight: bold;
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.no-results {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 14px;
}
</style>
