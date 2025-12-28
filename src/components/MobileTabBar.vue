<script setup>
const props = defineProps({
    activeView: String,
});

const emit = defineEmits(["change-view"]);
</script>

<template>
    <button
        class="toggle-view-btn"
        @click="
            emit('change-view', activeView === 'config' ? 'preview' : 'config')
        "
        :title="
            activeView === 'config' ? 'Ir a Vista Previa' : 'Ir a Configuración'
        "
    >
        <svg
            v-if="activeView !== 'config'"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2z"
            />
            <circle cx="12" cy="12" r="3" />
        </svg>

        <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>

        <span>{{
            activeView === "config" ? "Vista Previa" : "Configurar"
        }}</span>
    </button>
</template>

<style scoped>
.toggle-view-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--card-bg, #fff);
    border: 1px solid var(--border-color, #ccc);
    padding: 12px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.toggle-view-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toggle-view-btn svg {
    color: var(--text-primary, #333);
    transition: transform 0.3s ease;
}

/* El engranaje rotará al pasar el mouse */
.toggle-view-btn:hover svg {
    transform: rotate(90deg);
}

.toggle-view-btn span {
    display: none;
}

@media (min-width: 1025px) {
    .toggle-view-btn {
        display: none;
    }
}
</style>
