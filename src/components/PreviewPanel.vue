<script setup>
import { ref, watch } from "vue";

const props = defineProps({
    promptText: String,
    isMobile: Boolean,
});

const emit = defineEmits(["update-prompt"]);

const copyButtonText = ref("Copiar");

const localText = ref(props.promptText || "");

watch(
    () => props.promptText,
    (newVal) => {
        if (newVal !== localText.value) {
            localText.value = newVal;
        }
    },
);

let inputDebounce = null;
const handleInput = (e) => {
    const val = e.target.value;
    localText.value = val;
    clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => emit("update-prompt", val), 150);
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
        copyButtonText.value = "Error al copiar";
        setTimeout(() => {
            copyButtonText.value = "Copiar";
        }, 2000);
    }
};
</script>

<template>
    <aside class="preview-side" :class="{ mobile: isMobile }">
        <!-- Fix #1: aria-label en textarea -->
        <textarea
            :value="localText"
            @input="handleInput"
            class="prompt-editor"
            aria-label="Editor de prompt"
            placeholder="Escribe tu prompt aquí..."
        ></textarea>

        <div class="action-bar">
            <!-- Fix #2: aria-label dinámico + aria-live en copy btn -->
            <button
                class="copy-btn"
                @click="copyToClipboard"
                :aria-label="
                    copyButtonText === 'Copiar'
                        ? 'Copiar prompt al portapapeles'
                        : copyButtonText
                "
                :class="{
                    copied: copyButtonText === '✓ Copiado',
                    error: copyButtonText === 'Error al copiar',
                }"
            >
                <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                </svg>
                <span aria-live="polite">{{ copyButtonText }}</span>
            </button>
        </div>
    </aside>
</template>

<style scoped>
/* ─── LAYOUT BASE ────────────────────────────────────────────────────────── */
.preview-side {
    flex: 0 0 40%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    /* Separador sutil respecto al ConfigPanel — sin card envolvente */
    border-left: 1px solid var(--border-color);
    /* Fix #4: 100dvh via min-height para que el flex interno funcione */
    min-height: calc(100dvh - 60px); /* 60px = header height */
}

/* ─── MOBILE ─────────────────────────────────────────────────────────────── */
.preview-side.mobile {
    height: 100vh;
    height: 100dvh; /* Fix #3: iOS Safari safe area */
    min-height: unset;
    border-left: none;
    border-top: 1px solid var(--border-color);
}

/* ─── TEXTAREA ───────────────────────────────────────────────────────────── */
.prompt-editor {
    flex: 1;
    width: 100%;
    padding: 32px 36px;
    border: none; /* sin borde — es el panel completo */
    border-radius: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.9;
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    resize: none;
    outline: none;
    min-height: 0;
    /* Transición suave al hacer focus */
    transition: background 0.2s;
}

.prompt-editor::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
}

/* Focus: highlight sutil en el fondo del panel completo en lugar de un borde */
.preview-side:focus-within {
    background: var(--bg-primary);
}

.prompt-editor:focus {
    background: color-mix(in srgb, var(--accent) 3%, transparent);
}

/* ─── MOBILE TEXTAREA ────────────────────────────────────────────────────── */
.preview-side.mobile .prompt-editor {
    padding: 20px;
    font-size: 13px;
    line-height: 1.8;
}

/* ─── ACTION BAR ─────────────────────────────────────────────────────────── */
.action-bar {
    flex-shrink: 0;
    padding: 16px 36px;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-primary);
}

.preview-side.mobile .action-bar {
    padding: 12px 16px;
    /* Fix #3: espacio para barra de iOS */
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

/* ─── COPY BUTTON ────────────────────────────────────────────────────────── */
.copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition:
        background 0.2s,
        transform 0.15s,
        box-shadow 0.2s;
    min-height: 44px; /* touch target */
}

.copy-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 113, 227, 0.3);
}

.copy-btn:active {
    transform: translateY(0);
    box-shadow: none;
}

.copy-btn.copied {
    background: #30d158;
    box-shadow: 0 4px 12px rgba(48, 209, 88, 0.3);
}

.copy-btn.error {
    background: #ff3b30;
}

/* En mobile el botón ocupa todo el ancho */
.preview-side.mobile .copy-btn {
    flex: 1;
    justify-content: center;
    padding: 14px;
    border-radius: 12px;
    font-size: 15px;
}
</style>
