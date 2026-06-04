<template>
  <header class="top-bar panel">
    <div class="brand-block">
      <div class="brand-mark"></div>
      <div>
        <h1>智慧工厂数字孪生系统</h1>
        <p>Smart Factory Digital Twin Operation Center</p>
      </div>
    </div>
    <div class="top-metrics">
      <div class="metric">
        <span>在线设备</span>
        <strong>{{ onlineDeviceCount }}</strong>
      </div>
      <div class="metric">
        <span>连接状态</span>
        <strong :class="connected ? 'status-running' : 'status-error'">{{ connected ? 'ONLINE' : 'OFFLINE' }}</strong>
      </div>
      <div class="clock">{{ clock }}</div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { formatClock } from '@/utils/time';

defineProps<{
  onlineDeviceCount: number;
  connected: boolean;
}>();

const clock = ref(formatClock());
let timer: number | null = null;

onMounted(() => {
  timer = window.setInterval(() => {
    clock.value = formatClock();
  }, 1000);
});

onBeforeUnmount(() => {
  window.clearInterval(timer ?? undefined);
});
</script>

<style scoped>
.top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  padding: 0 24px;
  border-radius: 0;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border: 1px solid rgba(77, 255, 181, 0.55);
  background: linear-gradient(135deg, rgba(29, 143, 255, 0.35), rgba(77, 255, 181, 0.18));
  box-shadow: 0 0 24px rgba(29, 143, 255, 0.35);
  clip-path: polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%);
}

h1 {
  margin: 0;
  color: #eef8ff;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0;
}

p {
  margin: 4px 0 0;
  color: #6fa8d6;
  font-size: 12px;
}

.top-metrics {
  display: flex;
  align-items: center;
  gap: 18px;
}

.metric {
  min-width: 108px;
  padding: 8px 12px;
  border: 1px solid rgba(111, 183, 255, 0.18);
  background: rgba(6, 18, 34, 0.62);
}

.metric span {
  display: block;
  color: #7eaed6;
  font-size: 12px;
}

.metric strong {
  display: block;
  margin-top: 2px;
  font-size: 20px;
}

.clock {
  width: 196px;
  color: #dcecff;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
