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
        >
            <path
                d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
            ></path>
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
    background: var(--accent);
    color: white;
    border: none;
    padding: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
        background 0.3s ease,
        color 0.3s ease;
    box-shadow: 0 4px 16px rgba(0, 113, 227, 0.4);
    z-index: 999;
    width: 56px;
    height: 56px;
}

.toggle-view-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 113, 227, 0.6);
}

.toggle-view-btn:active {
    transform: scale(0.95);
}

.toggle-view-btn svg {
    color: white;
    transition: transform 0.4s ease;
}

/*.toggle-view-btn:hover .icon-gear {
    transform: rotate(90deg);
}

.toggle-view-btn:hover svg:not(.icon-gear) {
    transform: none;
}*/

.toggle-view-btn span {
    display: none;
}

@media (min-width: 1025px) {
    .toggle-view-btn {
        display: none;
    }
}
</style>
