<script setup>
const props = defineProps({
    parsedColors: Array,
    colorSelections: Object,
    activeSlot: String,
});

const emit = defineEmits(["set-active"]);
</script>

<template>
    <nav class="tabs" v-if="parsedColors.length > 0">
        <button
            v-for="color in parsedColors"
            :key="color.key"
            class="tab-item"
            :class="{ active: activeSlot === color.key }"
            @click="emit('set-active', color.key)"
        >
            <span
                class="indicator"
                :style="{ background: colorSelections[color.key] }"
            ></span>
            <div class="tab-label">{{ color.name.toUpperCase() }}</div>
            <div class="tab-val">{{ colorSelections[color.key] }}</div>
        </button>
    </nav>
</template>

<style scoped>
.tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-top: 3px;
    margin-bottom: 30px;
}

.tab-item {
    padding: 15px;
    border-radius: 12px;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
}

.tab-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.tab-item.active {
    border-color: var(--accent);
    background: var(--card-bg);
    box-shadow: var(--shadow-md);
}

.tab-item.active .indicator {
    animation: pulse 2s infinite;
}

.indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-bottom: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
}

.dark-theme .indicator {
    border-color: rgba(255, 255, 255, 0.2);
}

.tab-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-secondary);
}

.tab-val {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0px rgba(10, 132, 255, 0.4);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(10, 132, 255, 0);
    }
    100% {
        box-shadow: 0 0 0 0px rgba(10, 132, 255, 0);
    }
}
</style>
