<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
    promptText: String,
    isMobile: Boolean,
});

const emit = defineEmits(["update-prompt"]);

const copyButtonText = ref("Copiar");

// Ref local para el valor visual del textarea.
// Se actualiza inmediatamente en cada keystroke para que el cursor no salte,
// pero la emisión al padre (que dispara reactividad global) va debounceada.
const localText = ref(props.promptText || "");

// Sincronizar si el padre cambia el texto (ej. al cargar otra tarea)
watch(
    () => props.promptText,
    (newVal) => {
        if (newVal !== localText.value) {
            localText.value = newVal;
        }
    },
);

// Stats calculados sobre la ref local con debounce propio:
// no necesitan ser exactos al milisegundo, solo al pausar.
const promptStats = ref({ characters: 0, words: 0, lines: 0 });

let statsDebounce = null;
const updateStats = (text) => {
    clearTimeout(statsDebounce);
    statsDebounce = setTimeout(() => {
        promptStats.value = {
            characters: text.length,
            words: text.split(/\s+/).filter((w) => w.length > 0).length,
            lines: text.split("\n").length,
        };
    }, 300);
};

// Inicializar stats al montar
updateStats(localText.value);

let inputDebounce = null;
const handleInput = (e) => {
    const val = e.target.value;
    localText.value = val; // Actualización visual inmediata (no reactiva global)
    updateStats(val); // Stats con debounce 300ms
    clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => emit("update-prompt", val), 150); // Emisión al padre 150ms
};

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(localText.value);
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
        <div class="preview-content">
            <div class="card-header">
                <div class="stats">
                    <span class="stat-item"
                        >{{ promptStats.characters }}ch</span
                    >
                    <span class="stat-item">{{ promptStats.words }}p</span>
                    <span class="stat-item">{{ promptStats.lines }}l</span>
                </div>
            </div>

            <div class="prompt-scroll">
                <textarea
                    :value="localText"
                    @input="handleInput"
                    class="prompt-editor"
                    placeholder="Escribe tu prompt aquí..."
                ></textarea>
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

            <div class="mobile-spacer"></div>
        </div>
    </aside>
</template>

<style scoped>
.preview-side {
    flex: 0 0 40%;
    background: var(--bg-secondary);
    padding: 10px;
    /*overflow-y: auto;*/
}

.preview-side.mobile {
    height: 100vh;
    padding: 20px;
}

.preview-content {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 25px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 80px);
}

.card-header {
    margin-bottom: 16px;
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
    margin-bottom: 20px;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.prompt-editor {
    flex: 1;
    width: 100%;
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

.mobile-spacer {
    height: 0;
    min-height: 0;
}

@media (max-width: 1024px) {
    .mobile-spacer {
        height: 100px;
        min-height: 100px;
    }
}

@media (max-width: 768px) {
    .prompt-editor {
        font-size: 13px;
    }
}
</style>
