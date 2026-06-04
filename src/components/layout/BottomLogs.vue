<template>
  <footer class="bottom-logs panel">
    <div class="panel-title">实时日志</div>
    <div class="ticker">
      <div v-for="log in visibleLogs" :key="log.id" class="log-item">
        <span>{{ log.time.slice(-8) }}</span>
        <p>{{ log.message }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { FactoryLog } from '@/types/factory';
import { computed } from 'vue';

const props = defineProps<{
  logs: FactoryLog[];
}>();

const visibleLogs = computed(() => props.logs.slice(0, 8));
</script>

<style scoped>
.bottom-logs {
  position: absolute;
  right: 18px;
  bottom: 16px;
  left: 18px;
  z-index: 3;
  height: 104px;
  padding: 10px 14px;
  overflow: hidden;
}

.ticker {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(2, 26px);
  gap: 6px 10px;
  overflow: hidden;
}

.log-item {
  display: flex;
  min-width: 0;
  gap: 8px;
  align-items: center;
  padding: 5px 9px;
  background: rgba(255, 255, 255, 0.045);
  color: #cbe6ff;
  font-size: 12px;
}

.log-item span {
  color: #68c8ff;
  font-variant-numeric: tabular-nums;
}

.log-item p {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
