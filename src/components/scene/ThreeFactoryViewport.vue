<template>
  <main class="viewport-shell">
    <div ref="containerRef" class="three-container"></div>
    <div v-if="selectedDevice" class="device-popover panel">
      <div class="device-popover__head">
        <strong>{{ selectedDevice.name }}</strong>
        <ElTag size="small" :type="statusTag(selectedDevice.status)">{{ selectedDevice.status }}</ElTag>
      </div>
      <p>{{ selectedDevice.zone }} · {{ selectedDevice.id }}</p>
      <div class="data-grid">
        <span>温度</span>
        <strong>{{ selectedDevice.temperature.toFixed(1) }}℃</strong>
        <span>功率</span>
        <strong>{{ selectedDevice.power.toFixed(1) }}kW</strong>
      </div>
      <div v-if="selectedDevice.warning" class="warning-text">{{ selectedDevice.warning }}</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElTag } from 'element-plus';
import 'element-plus/es/components/tag/style/css';
import { FactoryScene } from '@/scene/FactoryScene';
import type { AGVTelemetry, DeviceStatus, DeviceTelemetry } from '@/types/factory';

const props = defineProps<{
  devices: DeviceTelemetry[];
  agvs: AGVTelemetry[];
  selectedDevice: DeviceTelemetry | null;
}>();

const emit = defineEmits<{
  (event: 'select-device', device: DeviceTelemetry | null): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let factoryScene: FactoryScene | null = null;
let resizeObserver: ResizeObserver | null = null;

const statusTag = (status: DeviceStatus) => {
  if (status === 'error') return 'danger';
  if (status === 'warning') return 'warning';
  if (status === 'offline') return 'info';
  return 'success';
};

onMounted(() => {
  factoryScene = new FactoryScene({
    container: containerRef.value!,
    devices: props.devices,
    onDeviceSelect: (device) => emit('select-device', device)
  });
  factoryScene.start();
  resizeObserver = new ResizeObserver(() => factoryScene?.resize());
  resizeObserver.observe(containerRef.value!);
});

watch(
  () => props.devices,
  (devices) => {
    devices.forEach((device) => factoryScene?.updateDevice(device));
  },
  { deep: true, immediate: true }
);

watch(
  () => props.agvs,
  (agvs) => {
    agvs.forEach((agv) => factoryScene?.updateAgv(agv));
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  factoryScene?.dispose();
});
</script>

<style scoped>
.viewport-shell {
  position: absolute;
  inset: 76px 0 0;
  z-index: 1;
}

.three-container {
  width: 100%;
  height: 100%;
}

.device-popover {
  position: absolute;
  top: 28px;
  left: 50%;
  z-index: 4;
  width: 286px;
  padding: 14px;
  transform: translateX(-50%);
  pointer-events: none;
}

.device-popover__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.device-popover__head strong {
  color: #eef8ff;
  font-size: 16px;
}

.device-popover p {
  margin: 8px 0 10px;
  color: #8fb9dd;
  font-size: 12px;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 6px;
  color: #9ec5e5;
  font-size: 12px;
}

.data-grid strong {
  color: #dcecff;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.warning-text {
  margin-top: 10px;
  padding: 8px;
  background: rgba(255, 200, 87, 0.12);
  color: #ffc857;
  font-size: 12px;
}
</style>
