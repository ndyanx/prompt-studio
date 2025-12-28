<script setup>
const props = defineProps({
    tasks: Array,
    currentTask: Object,
});

const emit = defineEmits([
    "close",
    "load-task",
    "create-task",
    "delete-task",
    "duplicate-task",
]);

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getColorCount = (task) => {
    return Object.keys(task.colors).length;
};
</script>

<template>
    <div class="tasks-container">
        <div class="overlay" @click="emit('close')" />

        <div class="tasks-panel">
            <div class="panel-header">
                <h2>Mis Tareas</h2>
                <button @click="emit('close')" class="close-btn">✕</button>
            </div>

            <div class="panel-actions">
                <button @click="emit('create-task')" class="new-task-btn">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nueva Tarea
                </button>
            </div>

            <div class="tasks-list">
                <div
                    v-for="task in tasks"
                    :key="task.id"
                    class="task-card"
                    :class="{ active: currentTask?.id === task.id }"
                >
                    <div class="task-header">
                        <h3 class="task-name">{{ task.name }}</h3>
                        <div class="task-meta">
                            <span class="task-date">{{
                                formatDate(task.updatedAt)
                            }}</span>
                            <span class="task-colors"
                                >{{ getColorCount(task) }} colores</span
                            >
                        </div>
                    </div>

                    <div class="task-preview">
                        {{ task.prompt.substring(0, 120)
                        }}{{ task.prompt.length > 120 ? "..." : "" }}
                    </div>

                    <div class="task-actions">
                        <button
                            @click="emit('load-task', task)"
                            class="task-btn load-btn"
                            :disabled="currentTask?.id === task.id"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path d="M3 3h18v18H3z" />
                            </svg>
                            {{
                                currentTask?.id === task.id
                                    ? "Actual"
                                    : "Cargar"
                            }}
                        </button>

                        <button
                            @click="emit('duplicate-task', task)"
                            class="task-btn"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
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
                        </button>

                        <button
                            @click="emit('delete-task', task.id)"
                            class="task-btn delete-btn"
                            :disabled="tasks.length === 1"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <polyline points="3 6 5 6 21 6" />
                                <path
                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div v-if="tasks.length === 0" class="empty-state">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                    >
                        <path
                            d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"
                        />
                    </svg>
                    <p>No hay tareas</p>
                    <span>Crea tu primera tarea para comenzar</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tasks-container {
    position: fixed;
    inset: 0;
    z-index: 1000;
}

.overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.tasks-panel {
    position: absolute;
    right: 0;
    top: 0;
    height: 100vh;
    width: 500px;
    max-width: 90vw;
    background: var(--card-bg);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
    }
    to {
        transform: translateX(0);
    }
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid var(--border-color);
}

.panel-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    transition: color 0.2s;
}

.close-btn:hover {
    color: var(--text-primary);
}

.panel-actions {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-color);
}

.new-task-btn {
    width: 100%;
    padding: 12px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.new-task-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.tasks-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.task-card {
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.2s;
}

.task-card:hover {
    border-color: var(--border-color);
    transform: translateX(-4px);
}

.task-card.active {
    border-color: var(--accent);
    background: var(--card-bg);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.15);
}

.task-header {
    margin-bottom: 12px;
}

.task-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
}

.task-meta {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: var(--text-secondary);
}

.task-colors {
    padding: 2px 8px;
    background: var(--accent);
    color: white;
    border-radius: 4px;
    font-weight: 600;
}

.task-preview {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: 12px;
    font-family: "SF Mono", monospace;
}

.task-actions {
    display: flex;
    gap: 8px;
}

.task-btn {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    transition: all 0.2s;
}

.task-btn:hover:not(:disabled) {
    background: var(--hover-bg);
}

.task-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.load-btn {
    flex: 1;
}

.load-btn:hover:not(:disabled) {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.delete-btn:hover:not(:disabled) {
    background: #ff3b30;
    color: white;
    border-color: #ff3b30;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-secondary);
    padding: 40px;
}

.empty-state svg {
    margin-bottom: 20px;
    opacity: 0.3;
}

.empty-state p {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.empty-state span {
    font-size: 14px;
}
</style>
