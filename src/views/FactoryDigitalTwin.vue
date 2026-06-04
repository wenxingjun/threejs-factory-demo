<template>
  <div class="factory-page">
    <TopBar :online-device-count="onlineDeviceCount" :connected="connected" />
    <ThreeFactoryViewport
      :devices="devices"
      :agvs="agvs"
      :selected-device="selectedDevice"
      @select-device="handleSceneSelect"
    />
    <LeftPanel
      :alarms="alarms"
      :devices="devices"
      :selected-device-id="selectedDeviceId"
      @select-device="handleListSelect"
    />
    <RightPanel
      :devices="devices"
      :agvs="agvs"
      :alarms="alarms"
      :today-tasks="todayTasks"
      :power-consumption="powerConsumption"
      :temperature-trend="temperatureTrend"
    />
    <BottomLogs :logs="logs" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted } from 'vue';
import BottomLogs from '@/components/layout/BottomLogs.vue';
import LeftPanel from '@/components/layout/LeftPanel.vue';
import RightPanel from '@/components/layout/RightPanel.vue';
import TopBar from '@/components/layout/TopBar.vue';
import ThreeFactoryViewport from '@/components/scene/ThreeFactoryViewport.vue';
import { useFactoryStore } from '@/store/factoryStore';
import type { DeviceTelemetry } from '@/types/factory';
import { websocketService } from '@/websocket/WebSocketService';

const store = useFactoryStore();
const {
  devices,
  agvs,
  alarms,
  logs,
  todayTasks,
  powerConsumption,
  temperatureTrend,
  selectedDeviceId,
  selectedDevice,
  onlineDeviceCount,
  connected
} = storeToRefs(store);

let unsubscribe: (() => void) | null = null;

const handleSceneSelect = (device: DeviceTelemetry | null) => {
  store.selectDevice(device?.id ?? null);
};

const handleListSelect = (id: string) => {
  store.selectDevice(id);
};

onMounted(() => {
  unsubscribe = websocketService.subscribe((message) => {
    if (message.type === 'snapshot') {
      store.applySnapshot(message.payload);
      store.setConnected(true);
    }
    if (message.type === 'device:update') {
      store.updateDevice(message.payload);
    }
    if (message.type === 'agv:update') {
      store.updateAgv(message.payload);
    }
    if (message.type === 'alarm') {
      store.pushAlarm(message.payload);
    }
    if (message.type === 'log') {
      store.pushLog(message.payload);
    }
  });
  websocketService.connect();
});

onBeforeUnmount(() => {
  unsubscribe?.();
  websocketService.disconnect();
  store.setConnected(false);
});
</script>

<style scoped>
.factory-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(29, 143, 255, 0.04), transparent 32%, transparent 68%, rgba(77, 255, 181, 0.035)),
    #07111f;
}

.factory-page::after {
  position: absolute;
  inset: 76px 0 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(7, 17, 31, 0.82), transparent 28%, transparent 72%, rgba(7, 17, 31, 0.82)),
    linear-gradient(180deg, rgba(7, 17, 31, 0.18), transparent 42%, rgba(7, 17, 31, 0.55));
  content: "";
}
</style>
