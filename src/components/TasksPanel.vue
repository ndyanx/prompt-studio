<script setup>
import { ref, computed } from "vue";

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

const searchQuery = ref("");
const sortBy = ref("updated"); // 'updated', 'created', 'name', 'colors'

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days} días`;

    return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
};

const getColorCount = (task) => {
    return Object.keys(task.colors).length;
};

const filteredAndSortedTasks = computed(() => {
    let result = [...props.tasks];

    // Filtrar por búsqueda
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            (task) =>
                task.name.toLowerCase().includes(query) ||
                task.prompt.toLowerCase().includes(query),
        );
    }

    // Ordenar
    result.sort((a, b) => {
        switch (sortBy.value) {
            case "updated":
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            case "created":
                return new Date(b.createdAt) - new Date(a.createdAt);
            case "name":
                return a.name.localeCompare(b.name);
            case "colors":
                return getColorCount(b) - getColorCount(a);
            default:
                return 0;
        }
    });

    return result;
});

const clearSearch = () => {
    searchQuery.value = "";
};
</script>

<template>
    <div class="modal-overlay" @click="emit('close')">
        <div class="modal-container" @click.stop>
            <!-- Header -->
            <div class="modal-header">
                <div class="header-left">
                    <h2>Mis Tareas</h2>
                    <span class="task-count">{{ tasks.length }} tareas</span>
                </div>
                <button @click="emit('close')" class="close-btn" title="Cerrar">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <!-- Toolbar -->
            <div class="modal-toolbar">
                <div class="search-container">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
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
                        placeholder="Buscar por nombre o contenido..."
                        class="search-input"
                    />
                    <button
                        v-if="searchQuery"
                        @click="clearSearch"
                        class="clear-search"
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
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div class="toolbar-actions">
                    <select v-model="sortBy" class="sort-select">
                        <option value="updated">Más reciente</option>
                        <option value="created">Más antiguo</option>
                        <option value="name">Nombre (A-Z)</option>
                        <option value="colors">Más colores</option>
                    </select>

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
                        Nueva
                    </button>
                </div>
            </div>

            <!-- Tasks Grid -->
            <div class="tasks-grid">
                <div
                    v-for="task in filteredAndSortedTasks"
                    :key="task.id"
                    class="task-card"
                    :class="{ active: currentTask?.id === task.id }"
                >
                    <!-- Card Header -->
                    <div class="card-header">
                        <div class="card-title">
                            <h3>{{ task.name }}</h3>
                            <span
                                class="badge"
                                v-if="currentTask?.id === task.id"
                                >Actual</span
                            >
                        </div>
                        <div class="card-actions">
                            <button
                                @click="emit('load-task', task)"
                                class="icon-btn load-btn"
                                :disabled="currentTask?.id === task.id"
                                title="Cargar tarea"
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
                                    <polyline points="23 4 23 10 17 10" />
                                    <path
                                        d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
                                    />
                                </svg>
                            </button>

                            <button
                                @click="emit('duplicate-task', task)"
                                class="icon-btn"
                                title="Duplicar"
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
                                class="icon-btn delete-btn"
                                :disabled="tasks.length === 1"
                                title="Eliminar"
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

                    <!-- Card Body -->
                    <div class="card-body">
                        <p class="prompt-preview">
                            {{ task.prompt.substring(0, 120)
                            }}{{ task.prompt.length > 120 ? "..." : "" }}
                        </p>
                    </div>

                    <!-- Card Footer -->
                    <div class="card-footer">
                        <div class="meta-info">
                            <span class="meta-item">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {{ formatDate(task.updatedAt) }}
                            </span>
                            <span class="meta-item colors-count">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 2a10 10 0 1 0 10 10" />
                                </svg>
                                {{ getColorCount(task) }} colores
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div
                    v-if="filteredAndSortedTasks.length === 0"
                    class="empty-state"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <h3>No se encontraron tareas</h3>
                    <p v-if="searchQuery">
                        Intenta con otro término de búsqueda
                    </p>
                    <p v-else>Crea tu primera tarea para comenzar</p>
                    <button
                        v-if="searchQuery"
                        @click="clearSearch"
                        class="clear-filters-btn"
                    >
                        Limpiar búsqueda
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal-container {
    background: var(--card-bg);
    border-radius: 24px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
    border-bottom: 1px solid var(--border-color);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.modal-header h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
}

.task-count {
    font-size: 14px;
    color: var(--text-secondary);
    padding: 4px 12px;
    background: var(--bg-secondary);
    border-radius: 20px;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.modal-toolbar {
    display: flex;
    gap: 16px;
    padding: 20px 32px;
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
}

.search-container {
    flex: 1;
    min-width: 300px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.2s;
}

.search-container:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
}

.search-container svg {
    color: var(--text-secondary);
    flex-shrink: 0;
}

.search-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: var(--text-primary);
}

.search-input::placeholder {
    color: var(--text-secondary);
}

.clear-search {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    transition: all 0.2s;
}

.clear-search:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.toolbar-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.sort-select {
    padding: 10px 16px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--card-bg);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
}

.sort-select:hover {
    border-color: var(--accent);
}

.new-task-btn {
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    white-space: nowrap;
}

.new-task-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.tasks-grid {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    align-content: start;
}

.task-card {
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: 16px;
    padding: 20px;
    transition: all 0.2s;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.task-card:hover {
    border-color: var(--border-color);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.task-card.active {
    border-color: var(--accent);
    background: var(--card-bg);
    box-shadow: 0 8px 24px rgba(10, 132, 255, 0.15);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.card-title {
    flex: 1;
    min-width: 0;
}

.card-title h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    border-radius: 4px;
    text-transform: uppercase;
}

.card-actions {
    display: flex;
    gap: 4px;
}

.icon-btn {
    padding: 6px;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    color: var(--text-primary);
}

.icon-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    transform: scale(1.1);
}

.icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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

.card-body {
    flex: 1;
}

.prompt-preview {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-footer {
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
}

.meta-info {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
}

.meta-item svg {
    flex-shrink: 0;
}

.colors-count {
    font-weight: 600;
}

.empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    gap: 16px;
}

.empty-state svg {
    opacity: 0.2;
    margin-bottom: 8px;
}

.empty-state h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}

.empty-state p {
    font-size: 14px;
    color: var(--text-secondary);
}

.clear-filters-btn {
    margin-top: 8px;
    padding: 10px 20px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.clear-filters-btn:hover {
    background: var(--accent-hover);
}

@media (max-width: 768px) {
    .modal-container {
        max-height: 95vh;
        border-radius: 16px;
    }

    .modal-header,
    .modal-toolbar,
    .tasks-grid {
        padding-left: 20px;
        padding-right: 20px;
    }

    /*.tasks-grid {
        grid-template-columns: 1fr;
    }*/

    .toolbar-actions {
        width: 100%;
    }

    .sort-select {
        flex: 1;
    }
}
</style>
