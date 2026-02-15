<script setup>
import { ref, computed, watch, onMounted, shallowRef } from "vue";

const props = defineProps({
    tasks: Array,
    currentTask: Object,
});

const emit = defineEmits([
    "close",
    "load-task",
    "create-task",
    "delete-task",
    "delete-all-tasks",
    "duplicate-task",
]);

// Configuración de paginación (persistente en localStorage)
const PAGINATION_KEY = "prompt-studio-pagination";
const itemsPerPage = ref(10);
const currentPage = ref(1);

const searchQuery = ref("");
const sortBy = ref("created-desc");
const viewMode = ref("grid");
const showDeleteModal = ref(false);
const taskToDelete = ref(null);
const deleteConfirmText = ref("");
const showDeleteAllModal = ref(false);
const deleteAllConfirmText = ref("");

// Cargar preferencia de paginación desde localStorage
const loadPaginationPreference = () => {
    const stored = localStorage.getItem(PAGINATION_KEY);
    if (stored) {
        itemsPerPage.value = parseInt(stored);
    }
};

// Guardar preferencia de paginación
const savePaginationPreference = (value) => {
    itemsPerPage.value = value;
    localStorage.setItem(PAGINATION_KEY, value.toString());
    currentPage.value = 1; // Resetear a primera página al cambiar cantidad
};

// Cargar al montar
onMounted(() => {
    loadPaginationPreference();
});

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
    return Object.keys(task.colors || {}).length;
};

const getDuplicateCount = (taskName) => {
    return props.tasks.filter((t) => t.name.trim() === taskName.trim()).length;
};

const hasUrl = (task) => {
    return !!(task.url_post || task.url_video);
};

// Cache para optimización con muchas tareas (466+)
const lastFilterParams = ref({ query: "", sortBy: "", tasksLength: 0 });
const cachedFilteredTasks = shallowRef([]);

const filteredAndSortedTasks = computed(() => {
    // Detectar si necesitamos recalcular
    const currentParams = {
        query: searchQuery.value,
        sortBy: sortBy.value,
        tasksLength: props.tasks.length,
    };

    const needsRecalculation =
        currentParams.query !== lastFilterParams.value.query ||
        currentParams.sortBy !== lastFilterParams.value.sortBy ||
        currentParams.tasksLength !== lastFilterParams.value.tasksLength;

    // Si no hay cambios, retornar cache
    if (!needsRecalculation && cachedFilteredTasks.value.length > 0) {
        return cachedFilteredTasks.value;
    }

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
            case "updated-desc":
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            case "created-desc":
                return new Date(b.createdAt) - new Date(a.createdAt);
            case "created-asc":
                return new Date(a.createdAt) - new Date(b.createdAt);
            case "name":
                return a.name.localeCompare(b.name);
            case "colors":
                return getColorCount(b) - getColorCount(a);
            default:
                return 0;
        }
    });

    // Actualizar cache
    cachedFilteredTasks.value = result;
    lastFilterParams.value = currentParams;

    console.log(
        `📊 Filtradas ${result.length} de ${props.tasks.length} tareas`,
    );

    return result;
});

// Calcular total de páginas
const totalPages = computed(() => {
    return Math.ceil(filteredAndSortedTasks.value.length / itemsPerPage.value);
});

// Tareas paginadas
const paginatedTasks = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredAndSortedTasks.value.slice(start, end);
});

// Resetear a primera página cuando cambie la búsqueda
watch(searchQuery, () => {
    currentPage.value = 1;
});

// Validar página actual cuando cambien las tareas filtradas
watch(totalPages, (newTotal) => {
    if (currentPage.value > newTotal && newTotal > 0) {
        currentPage.value = newTotal;
    } else if (newTotal === 0) {
        currentPage.value = 1;
    }
});

const clearSearch = () => {
    searchQuery.value = "";
};

const openDeleteModal = (task) => {
    taskToDelete.value = task;
    showDeleteModal.value = true;
    deleteConfirmText.value = "";
};

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    taskToDelete.value = null;
    deleteConfirmText.value = "";
};

const confirmDelete = () => {
    if (deleteConfirmText.value.toLowerCase() === "eliminar") {
        emit("delete-task", taskToDelete.value.id);
        closeDeleteModal();
    }
};

const isDeleteEnabled = computed(() => {
    return deleteConfirmText.value.toLowerCase() === "eliminar";
});

const openDeleteAllModal = () => {
    showDeleteAllModal.value = true;
    deleteAllConfirmText.value = "";
};

const closeDeleteAllModal = () => {
    showDeleteAllModal.value = false;
    deleteAllConfirmText.value = "";
};

const confirmDeleteAll = () => {
    if (deleteAllConfirmText.value.toLowerCase() === "reset") {
        emit("delete-all-tasks");
        closeDeleteAllModal();
        emit("close"); // Cerrar el panel después de eliminar
    }
};

const isDeleteAllEnabled = computed(() => {
    return deleteAllConfirmText.value.toLowerCase() === "reset";
});

// Navegación de páginas
const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++;
    }
};

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
    }
};

// Generar array de números de página para mostrar
const pageNumbers = computed(() => {
    const pages = [];
    const total = totalPages.value;
    const current = currentPage.value;

    if (total <= 7) {
        // Mostrar todas las páginas
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // Mostrar páginas con elipsis
        if (current <= 4) {
            // Cerca del inicio
            for (let i = 1; i <= 5; i++) {
                pages.push(i);
            }
            pages.push("...");
            pages.push(total);
        } else if (current >= total - 3) {
            // Cerca del final
            pages.push(1);
            pages.push("...");
            for (let i = total - 4; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // En el medio
            pages.push(1);
            pages.push("...");
            for (let i = current - 1; i <= current + 1; i++) {
                pages.push(i);
            }
            pages.push("...");
            pages.push(total);
        }
    }

    return pages;
});
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
                    <div class="view-toggle">
                        <button
                            @click="viewMode = 'grid'"
                            :class="{ active: viewMode === 'grid' }"
                            class="view-btn"
                            title="Vista cuadrícula"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </button>
                        <button
                            @click="viewMode = 'list'"
                            :class="{ active: viewMode === 'list' }"
                            class="view-btn"
                            title="Vista lista"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <!-- Selector de cantidad de elementos -->
                    <div class="items-per-page">
                        <label for="items-select">Mostrar:</label>
                        <select
                            id="items-select"
                            :value="itemsPerPage"
                            @change="
                                savePaginationPreference(
                                    parseInt($event.target.value),
                                )
                            "
                            class="items-select"
                        >
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="30">30</option>
                            <option :value="40">40</option>
                            <option :value="50">50</option>
                        </select>
                    </div>

                    <select v-model="sortBy" class="sort-select">
                        <option value="updated-desc">
                            Última modificación
                        </option>
                        <option value="created-desc">Creación reciente</option>
                        <option value="created-asc">Creación antigua</option>
                        <option value="name">Nombre (A-Z)</option>
                        <option value="colors">Más colores</option>
                    </select>

                    <button
                        @click="openDeleteAllModal"
                        class="delete-all-btn"
                        title="Borrar todas las tareas"
                        :disabled="tasks.length === 0"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <polyline points="3 6 5 6 21 6" />
                            <path
                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                            />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Borrar todo
                    </button>

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
            <div
                class="tasks-grid"
                :class="{ 'list-view': viewMode === 'list' }"
            >
                <div
                    v-for="task in paginatedTasks"
                    :key="task.id"
                    v-memo="[
                        task.id,
                        task.name,
                        task.updatedAt,
                        currentTask?.id === task.id,
                    ]"
                    class="task-card"
                    :class="{ active: currentTask?.id === task.id }"
                >
                    <!-- Card Header -->
                    <div class="card-header">
                        <div class="card-title">
                            <div class="title-row">
                                <h3>
                                    {{ task.name }}
                                    <span
                                        v-if="getDuplicateCount(task.name) > 1"
                                        class="duplicate-badge"
                                        :title="`Existen ${getDuplicateCount(task.name)} tareas con este nombre`"
                                    >
                                        ×{{ getDuplicateCount(task.name) }}
                                    </span>
                                </h3>
                                <span
                                    class="badge"
                                    v-if="currentTask?.id === task.id"
                                    >✓</span
                                >
                            </div>
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
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline points="9 11 12 14 22 4" />
                                    <path
                                        d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                                    />
                                </svg>
                            </button>
                            <button
                                @click="emit('duplicate-task', task)"
                                class="icon-btn"
                                title="Duplicar tarea"
                            >
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
                            </button>
                            <button
                                @click="openDeleteModal(task)"
                                class="icon-btn delete-btn"
                                title="Eliminar tarea"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
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
                        <!-- Metadata -->
                        <div class="meta-info">
                            <div class="meta-item">
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
                            </div>

                            <div
                                class="meta-item"
                                v-if="getColorCount(task) > 0"
                            >
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
                                </svg>
                                <span class="colors-count">{{
                                    getColorCount(task)
                                }}</span>
                                colores
                            </div>

                            <div class="meta-item" v-if="hasUrl(task)">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                                    />
                                    <path
                                        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                                    />
                                </svg>
                                <span class="has-url">Con enlace</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="paginatedTasks.length === 0" class="empty-state">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <h3>No se encontraron tareas</h3>
                    <p v-if="searchQuery">
                        Intenta con otros términos de búsqueda
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

            <!-- Paginación -->
            <div v-if="totalPages > 1" class="pagination">
                <div class="pagination-controls">
                    <button
                        @click="prevPage"
                        :disabled="currentPage === 1"
                        class="page-btn"
                        title="Página anterior"
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
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <div class="page-numbers">
                        <button
                            v-for="(page, index) in pageNumbers"
                            :key="index"
                            @click="
                                typeof page === 'number' ? goToPage(page) : null
                            "
                            :class="{
                                'page-number': true,
                                active: page === currentPage,
                                ellipsis: page === '...',
                            }"
                            :disabled="page === '...'"
                        >
                            {{ page }}
                        </button>
                    </div>

                    <button
                        @click="nextPage"
                        :disabled="currentPage === totalPages"
                        class="page-btn"
                        title="Página siguiente"
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
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div class="page-info">
                    Página {{ currentPage }} de {{ totalPages }}
                    <span class="separator">•</span>
                    {{ filteredAndSortedTasks.length }} tareas
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de confirmación de eliminación individual -->
    <Transition name="delete-modal">
        <div v-if="showDeleteModal" class="delete-modal-overlay">
            <div class="delete-modal">
                <div class="delete-modal-icon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                        />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>

                <h3 class="delete-modal-title">¿Eliminar tarea?</h3>

                <p class="delete-modal-description">
                    Estás a punto de eliminar
                    <strong>{{ taskToDelete?.name }}</strong
                    >. Esta acción no se puede deshacer.
                </p>

                <div class="delete-modal-input-group">
                    <label class="delete-modal-label">
                        Escribe <strong>eliminar</strong> para confirmar
                    </label>
                    <input
                        v-model="deleteConfirmText"
                        type="text"
                        class="delete-modal-input"
                        placeholder="eliminar"
                        @keyup.enter="isDeleteEnabled ? confirmDelete() : null"
                    />
                </div>

                <div class="delete-modal-actions">
                    <button @click="closeDeleteModal" class="cancel-btn">
                        Cancelar
                    </button>
                    <button
                        @click="confirmDelete"
                        :disabled="!isDeleteEnabled"
                        class="confirm-delete-btn"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Modal de confirmación de borrar todas las tareas -->
    <Transition name="delete-modal">
        <div v-if="showDeleteAllModal" class="delete-modal-overlay">
            <div class="delete-modal">
                <div class="delete-modal-icon delete-all-icon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <polyline points="3 6 5 6 21 6" />
                        <path
                            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </div>

                <h3 class="delete-modal-title">¿Borrar todas las tareas?</h3>

                <p class="delete-modal-description">
                    Estás a punto de
                    <strong>eliminar todas las {{ tasks.length }} tareas</strong
                    >. Esta acción no se puede deshacer y se creará una nueva
                    tarea vacía.
                </p>

                <div class="delete-modal-input-group">
                    <label class="delete-modal-label">
                        Escribe <strong>reset</strong> para confirmar
                    </label>
                    <input
                        v-model="deleteAllConfirmText"
                        type="text"
                        class="delete-modal-input"
                        placeholder="reset"
                        @keyup.enter="
                            isDeleteAllEnabled ? confirmDeleteAll() : null
                        "
                    />
                </div>

                <div class="delete-modal-actions">
                    <button @click="closeDeleteAllModal" class="cancel-btn">
                        Cancelar
                    </button>
                    <button
                        @click="confirmDeleteAll"
                        :disabled="!isDeleteAllEnabled"
                        class="confirm-delete-btn"
                    >
                        Borrar todo
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Copiar todos los estilos del documento original */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
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
    max-width: 1200px;
    width: 100%;
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

/* Header */
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
    gap: 12px;
}

.header-left h2 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
}

.task-count {
    padding: 4px 10px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
}

.close-btn {
    background: transparent;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

/* Toolbar */
.modal-toolbar {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.search-container {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
}

.search-container svg {
    position: absolute;
    left: 14px;
    color: var(--text-secondary);
    pointer-events: none;
}

.search-input {
    width: 100%;
    padding: 12px 14px 12px 44px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
}

.search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}

.clear-search {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
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
    flex-wrap: wrap;
}

.view-toggle {
    display: flex;
    gap: 4px;
    background: var(--bg-secondary);
    padding: 4px;
    border-radius: 10px;
}

.view-btn {
    background: transparent;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.view-btn:hover {
    color: var(--text-primary);
}

.view-btn.active {
    background: var(--white);
    color: var(--accent);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dark-theme .view-btn.active {
    background: var(--hover-bg);
}

/* Items per page selector */
.items-per-page {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
}

.items-per-page label {
    font-weight: 500;
}

.items-select {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
}

.items-select:hover {
    border-color: var(--accent);
}

.items-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}

.sort-select {
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
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

.sort-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}

.delete-all-btn {
    padding: 10px 20px;
    background: rgba(255, 59, 48, 0.1);
    color: #ff3b30;
    border: 1px solid rgba(255, 59, 48, 0.3);
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

.delete-all-btn:hover:not(:disabled) {
    background: rgba(255, 59, 48, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);
}

.delete-all-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.new-task-btn {
    padding: 10px 18px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.new-task-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

/* Tasks Grid */
.tasks-grid {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    align-content: start;
}

.list-view {
    grid-template-columns: 1fr;
}

.task-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 20px;
    transition: all 0.2s;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.task-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}

.task-card.active {
    border-color: var(--accent);
    background: rgba(0, 113, 227, 0.05);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
}

.card-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.card-title h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    word-break: break-word;
    flex: 1;
    min-width: 0;
}

.duplicate-badge {
    background: rgba(255, 149, 0, 0.15);
    color: #ff9500;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
}

.badge {
    background: var(--accent);
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 113, 227, 0.2);
}

.card-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.icon-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--accent);
}

.icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.load-btn:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
}

.load-btn:hover:not(:disabled) {
    background: var(--accent);
    color: white;
}

.delete-btn:hover:not(:disabled) {
    border-color: #ff3b30;
    color: #ff3b30;
    background: rgba(255, 59, 48, 0.1);
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
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

.has-url {
    font-weight: 600;
    color: var(--accent);
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

/* Paginación */
.pagination {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 32px;
    border-top: 1px solid var(--border-color);
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    justify-content: center;
}

.page-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    transition: all 0.2s;
    flex-shrink: 0;
}

.page-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--accent);
}

.page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.page-numbers {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
    flex: 1;
    max-width: 400px;
}

.page-number {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
    flex-shrink: 0;
}

.page-number:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
    color: var(--accent);
}

.page-number.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
}

.page-number.ellipsis {
    background: transparent;
    border: none;
    cursor: default;
    color: var(--text-secondary);
}

.page-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.separator {
    opacity: 0.5;
}

/* Modal de confirmación de eliminación */
.delete-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
}

.delete-modal {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 32px;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.3s ease;
}

.delete-modal-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 59, 48, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
}

.delete-modal-icon svg {
    color: #ff3b30;
}

.delete-all-icon {
    background: rgba(255, 59, 48, 0.1);
}

.delete-modal-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    margin-bottom: 12px;
}

.delete-modal-description {
    font-size: 15px;
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.6;
    margin-bottom: 24px;
}

.delete-modal-description strong {
    color: var(--text-primary);
    font-weight: 600;
}

.delete-modal-input-group {
    margin-bottom: 24px;
}

.delete-modal-label {
    display: block;
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    text-align: center;
}

.delete-modal-label strong {
    color: var(--text-primary);
    font-weight: 600;
    font-family: "SF Mono", Monaco, monospace;
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
}

.delete-modal-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 15px;
    font-family: "SF Mono", Monaco, monospace;
    text-align: center;
    outline: none;
    transition: all 0.2s;
}

.delete-modal-input:focus {
    border-color: #ff3b30;
    box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}

.delete-modal-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
}

.delete-modal-actions {
    display: flex;
    gap: 12px;
}

.cancel-btn,
.confirm-delete-btn {
    flex: 1;
    padding: 14px 20px;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s;
}

.cancel-btn {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.cancel-btn:hover {
    background: var(--hover-bg);
}

.confirm-delete-btn {
    background: #ff3b30;
    color: white;
}

.confirm-delete-btn:hover:not(:disabled) {
    background: #ff453a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.confirm-delete-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Transiciones del modal de eliminación */
.delete-modal-enter-active,
.delete-modal-leave-active {
    transition: all 0.3s ease;
}

.delete-modal-enter-active .delete-modal,
.delete-modal-leave-active .delete-modal {
    transition: all 0.3s ease;
}

.delete-modal-enter-from,
.delete-modal-leave-to {
    opacity: 0;
}

.delete-modal-enter-from .delete-modal {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
}

.delete-modal-leave-to .delete-modal {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
}

@media (max-width: 768px) {
    .modal-container {
        max-height: 85vh;
        border-radius: 16px;
    }

    .modal-header,
    .modal-toolbar,
    .tasks-grid,
    .pagination {
        padding-left: 20px;
        padding-right: 20px;
    }

    .modal-header {
        padding: 16px 20px;
    }

    .header-left h2 {
        font-size: 20px;
    }

    .task-count {
        font-size: 12px;
        padding: 3px 8px;
    }

    .toolbar-actions {
        width: 100%;
        flex-wrap: wrap;
    }

    .view-toggle {
        order: -1;
    }

    .items-per-page {
        flex: 1;
        min-width: 140px;
    }

    .sort-select {
        flex: 1;
    }

    .delete-all-btn {
        flex: 1 1 auto;
        min-width: 140px;
    }

    .new-task-btn {
        width: 100%;
    }

    .list-view .task-card {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
    }

    .list-view .card-header {
        min-width: auto;
    }

    .delete-modal {
        padding: 24px;
    }

    .delete-modal-title {
        font-size: 20px;
    }

    .delete-modal-description {
        font-size: 14px;
    }

    .pagination {
        flex-direction: column;
        gap: 16px;
    }

    .page-info {
        order: -1;
    }
}

@media (max-width: 480px) {
    .modal-overlay {
        padding: 10px;
    }

    .modal-header,
    .modal-toolbar,
    .tasks-grid,
    .pagination {
        padding-left: 16px;
        padding-right: 16px;
    }

    .modal-header {
        padding: 12px 16px;
        gap: 8px;
    }

    .header-left {
        gap: 8px;
        flex-wrap: wrap;
    }

    .header-left h2 {
        font-size: 18px;
    }

    .task-count {
        font-size: 11px;
        padding: 2px 6px;
    }

    .close-btn {
        width: 36px;
        height: 36px;
    }

    .modal-toolbar {
        padding: 12px 16px;
        gap: 12px;
    }

    .search-input {
        padding: 10px 12px 10px 38px;
        font-size: 13px;
    }

    .search-container svg {
        left: 12px;
        width: 16px;
        height: 16px;
    }

    .toolbar-actions {
        gap: 8px;
    }

    .view-toggle {
        flex: 1;
        max-width: 80px;
    }

    .view-btn {
        width: 32px;
        height: 32px;
    }

    .view-btn svg {
        width: 16px;
        height: 16px;
    }

    .items-per-page {
        flex: 1;
        min-width: auto;
        font-size: 12px;
    }

    .items-per-page label {
        display: none;
    }

    .items-select {
        padding: 6px 8px;
        font-size: 12px;
        flex: 1;
    }

    .sort-select {
        padding: 8px 10px;
        font-size: 12px;
    }

    .delete-all-btn {
        padding: 8px 14px;
        font-size: 13px;
        gap: 4px;
    }

    .new-task-btn {
        padding: 8px 14px;
        font-size: 13px;
        gap: 4px;
    }

    .new-task-btn svg,
    .delete-all-btn svg {
        width: 16px;
        height: 16px;
    }

    .tasks-grid {
        padding: 12px 16px;
        gap: 12px;
        grid-template-columns: 1fr;
    }

    .task-card {
        padding: 14px;
        gap: 12px;
    }

    .card-header {
        gap: 8px;
        flex-wrap: wrap;
    }

    .card-title h3 {
        font-size: 14px;
    }

    .duplicate-badge {
        font-size: 10px;
        padding: 2px 5px;
    }

    .badge {
        width: 20px;
        height: 20px;
        font-size: 11px;
    }

    .card-actions {
        gap: 4px;
        width: 100%;
        justify-content: flex-end;
    }

    .icon-btn {
        width: 32px;
        height: 32px;
    }

    .icon-btn svg {
        width: 16px;
        height: 16px;
    }

    .meta-info {
        gap: 12px;
    }

    .meta-item {
        font-size: 11px;
    }

    .meta-item svg {
        width: 12px;
        height: 12px;
    }

    .pagination {
        padding: 12px 16px;
        gap: 12px;
    }

    .pagination-controls {
        gap: 6px;
    }

    .page-btn {
        width: 32px;
        height: 32px;
    }

    .page-btn svg {
        width: 14px;
        height: 14px;
    }

    .page-numbers {
        gap: 4px;
        max-width: 100%;
    }

    .page-number {
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        font-size: 13px;
    }

    .page-info {
        font-size: 12px;
        gap: 6px;
    }

    .delete-modal {
        padding: 20px;
    }

    .delete-modal-icon {
        width: 56px;
        height: 56px;
        margin-bottom: 16px;
    }

    .delete-modal-icon svg {
        width: 28px;
        height: 28px;
    }

    .delete-modal-title {
        font-size: 18px;
    }

    .delete-modal-description {
        font-size: 13px;
    }

    .delete-modal-input {
        padding: 10px 12px;
        font-size: 14px;
    }

    .cancel-btn,
    .confirm-delete-btn {
        padding: 12px 16px;
        font-size: 14px;
    }
}

/* Para pantallas muy pequeñas como 344px */
@media (max-width: 360px) {
    .modal-header,
    .modal-toolbar,
    .tasks-grid {
        padding-left: 12px;
        padding-right: 12px;
    }

    .header-left h2 {
        font-size: 16px;
    }

    .toolbar-actions {
        gap: 6px;
    }

    .view-toggle {
        max-width: 72px;
    }

    .items-select,
    .sort-select {
        font-size: 11px;
    }

    .delete-all-btn,
    .new-task-btn {
        font-size: 12px;
        padding: 8px 12px;
    }

    .tasks-grid {
        padding: 10px 12px;
        gap: 10px;
    }

    .task-card {
        padding: 12px;
    }

    .card-title h3 {
        font-size: 13px;
    }

    .card-actions {
        gap: 3px;
    }

    .icon-btn {
        width: 30px;
        height: 30px;
    }

    .pagination {
        padding: 10px 12px;
        gap: 8px;
    }

    .pagination-controls {
        gap: 4px;
        width: 100%;
    }

    .page-btn {
        width: 30px;
        height: 30px;
    }

    .page-numbers {
        gap: 3px;
        flex: 1;
    }

    .page-number {
        min-width: 28px;
        height: 28px;
        padding: 0 6px;
        font-size: 12px;
    }

    .page-info {
        font-size: 11px;
        gap: 4px;
        text-align: center;
    }

    .delete-modal-actions {
        flex-direction: column;
    }

    .cancel-btn,
    .confirm-delete-btn {
        width: 100%;
    }
}
</style>
