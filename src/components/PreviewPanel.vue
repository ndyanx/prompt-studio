<script setup>
import { ref, computed } from "vue";

const props = defineProps({
    promptText: String,
    finalPrompt: String,
    parsedColors: Array,
    colorSelections: Object,
    isMobile: Boolean,
});

const emit = defineEmits(["update-prompt"]);

const copyButtonText = ref("Copiar");
const isEditing = ref(true);

const promptStats = computed(() => {
    const text = props.finalPrompt;
    return {
        characters: text.length,
        words: text.split(/\s+/).filter((w) => w.length > 0).length,
        lines: text.split("\n").length,
        colors: props.parsedColors.length,
    };
});

const highlightedPrompt = computed(() => {
    let text = props.promptText;
    props.parsedColors.forEach(({ placeholder, key }) => {
        const color = props.colorSelections[key];
        text = text.replace(
            placeholder,
            `<span class="color-highlight" style="color: ${color}; border-bottom: 2px solid ${color}">${placeholder}</span>`,
        );
    });
    return text;
});

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(props.finalPrompt);
        copyButtonText.value = "✓ Copiado";
        setTimeout(() => {
            copyButtonText.value = "Copiar";
        }, 1200);
    } catch (err) {
        console.error("Error al copiar:", err);
    }
};
</script>

<template>
    <aside class="preview-side" :class="{ mobile: isMobile }">
        <div class="preview-card">
            <div class="card-header">
                <div class="card-tag">
                    <button
                        @click="isEditing = !isEditing"
                        class="toggle-mode"
                        :class="{ active: isEditing }"
                    >
                        ✎ Editar
                    </button>
                    <button
                        @click="isEditing = !isEditing"
                        class="toggle-mode"
                        :class="{ active: !isEditing }"
                    >
                        👁 Previa
                    </button>
                </div>

                <div class="stats">
                    <span class="stat-item"
                        >{{ promptStats.characters }}ch</span
                    >
                    <span class="stat-item">{{ promptStats.words }}p</span>
                    <span class="stat-item">{{ promptStats.colors }}c</span>
                </div>
            </div>

            <div class="prompt-scroll">
                <textarea
                    v-if="isEditing"
                    :value="promptText"
                    @input="emit('update-prompt', $event.target.value)"
                    class="prompt-editor"
                    placeholder="Escribe tu prompt aquí...

Usa {color} o {color:nombre}

Ejemplo:
Gato {color:pelaje} con ojos {color:ojos}"
                ></textarea>

                <div v-else class="prompt-preview">
                    <div class="preview-section">
                        <div class="preview-label">Con placeholders:</div>
                        <div
                            class="prompt-content"
                            v-html="highlightedPrompt"
                        ></div>
                    </div>

                    <div class="preview-section">
                        <div class="preview-label">Final:</div>
                        <div class="prompt-content final-content">
                            {{ finalPrompt }}
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="copy-btn" @click="copyToClipboard">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                        />
                        <path
                            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        />
                    </svg>
                    {{ copyButtonText }}
                </button>
            </div>
        </div>
    </aside>
</template>

<style scoped>
.preview-side {
    flex: 0 0 40%;
    background: var(--bg-secondary);
    padding: 40px;
    overflow-y: auto;
}

.preview-side.mobile {
    height: 100vh;
    padding-bottom: 120px; /* Espacio para botón flotante + controles del sistema */
}

.preview-card {
    background: var(--card-bg);
    height: 100%;
    min-height: 500px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    padding: 25px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
}

.card-header {
    margin-bottom: 20px;
}

.card-tag {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.toggle-mode {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
}

.toggle-mode.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.stats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.stat-item {
    font-size: 11px;
    color: var(--text-secondary);
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-weight: 600;
}

.prompt-scroll {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
    min-height: 0;
}

.prompt-editor {
    width: 100%;
    height: 100%;
    min-height: 300px;
    padding: 16px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.8;
    font-family: "SF Mono", Monaco, monospace;
    resize: none;
    outline: none;
    transition: border-color 0.2s;
}

.prompt-editor:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.prompt-preview {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.preview-section {
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
}

.preview-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
}

.prompt-content {
    font-size: 13px;
    line-height: 1.8;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    font-family: "SF Mono", Monaco, monospace;
}

.prompt-content :deep(.color-highlight) {
    font-weight: 700;
    padding: 2px 4px;
    border-radius: 4px;
    background: rgba(10, 132, 255, 0.1);
}

.action-buttons {
    display: flex;
    gap: 12px;
}

.copy-btn {
    flex: 1;
    padding: 16px;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    background: var(--accent);
    color: white;
}

.copy-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 113, 227, 0.3);
}

.copy-btn:active {
    transform: translateY(0);
}

@media (max-width: 768px) {
    .prompt-editor {
        font-size: 13px;
    }

    .prompt-content {
        font-size: 12px;
    }
}
</style>
