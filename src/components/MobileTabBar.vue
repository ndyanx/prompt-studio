<script setup>
const props = defineProps({
    activeView: String,
});

const emit = defineEmits(["change-view"]);
</script>

<template>
    <div class="mobile-tab-bar">
        <button
            class="tab-bar-btn"
            :class="{ active: activeView === 'config' }"
            @click="emit('change-view', 'config')"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="3" />
                <path
                    d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m-6 0l-4.2 4.2"
                />
            </svg>
            <span>Configurar</span>
        </button>

        <button
            class="tab-bar-btn"
            :class="{ active: activeView === 'preview' }"
            @click="emit('change-view', 'preview')"
        >
            <svg
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
            <span>Vista Previa</span>
        </button>
    </div>
</template>

<style scoped>
.mobile-tab-bar {
    /*position: fixed;*/
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    display: flex;
    /*padding: 8px;*/
    gap: 8px;
    z-index: 100;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

.tab-bar-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    font-weight: 600;
}

.tab-bar-btn.active {
    color: var(--accent);
    background: var(--bg-secondary);
}

.tab-bar-btn svg {
    width: 24px;
    height: 24px;
}

@media (min-width: 1025px) {
    .mobile-tab-bar {
        display: none;
    }
}
</style>
