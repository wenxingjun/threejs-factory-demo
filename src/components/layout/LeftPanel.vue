<template>
  <aside class="left-panel">
    <section class="panel block">
      <div class="panel-title">实时告警</div>
      <div class="alarm-list">
        <div v-for="alarm in alarms" :key="alarm.id" class="alarm-item" :class="`alarm-${alarm.level}`">
          <div class="alarm-head">
            <span>{{ alarm.source }}</span>
            <em>{{ alarm.time.slice(-8) }}</em>
          </div>
          <p>{{ alarm.message }}</p>
        </div>
      </div>
    </section>

    <section class="panel block device-block">
      <div class="panel-title">设备状态</div>
      <div class="device-list">
        <button
          v-for="device in devices"
          :key="device.id"
          class="device-row"
          :class="{ active: selectedDeviceId === device.id }"
          @click="$emit('select-device', device.id)"
        >
          <span class="status-dot" :class="`status-${device.status}`"></span>
          <span class="device-name">{{ device.name }}</span>
          <span class="device-temp">{{ device.temperature.toFixed(1) }}℃</span>
        </button>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { DeviceTelemetry, FactoryAlarm } from '@/types/factory';

defineProps<{
  alarms: FactoryAlarm[];
  devices: DeviceTelemetry[];
  selectedDeviceId: string | null;
}>();

defineEmits<{
  (event: 'select-device', id: string): void;
}>();
</script>

<style scoped>
.left-panel {
  position: absolute;
  top: 92px;
  bottom: 126px;
  left: 18px;
  z-index: 3;
  display: grid;
  width: 326px;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 14px;
}

.block {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px;
  overflow: hidden;
}

.alarm-list,
.device-list {
  flex: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(104, 200, 255, 0.45) rgba(255, 255, 255, 0.04);
}

.alarm-list::-webkit-scrollbar,
.device-list::-webkit-scrollbar {
  width: 5px;
}

.alarm-list::-webkit-scrollbar-thumb,
.device-list::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(104, 200, 255, 0.42);
}

.alarm-list::-webkit-scrollbar-track,
.device-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.alarm-item {
  flex: 0 0 auto;
  padding: 10px;
  border-left: 3px solid currentColor;
  background: rgba(255, 255, 255, 0.045);
}

.alarm-info {
  color: #68c8ff;
}

.alarm-warning {
  color: #ffc857;
}

.alarm-critical {
  color: #ff4d6d;
}

.alarm-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
}

.alarm-head em {
  color: #8aa8c4;
  font-style: normal;
  font-weight: 500;
}

.alarm-item p {
  margin: 6px 0 0;
  color: #dcecff;
  font-size: 12px;
  line-height: 1.45;
}

.device-block {
  overflow: hidden;
}

.device-row {
  flex: 0 0 auto;
  display: grid;
  width: 100%;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(111, 183, 255, 0.13);
  background: rgba(9, 26, 45, 0.62);
  color: #dcecff;
  cursor: pointer;
  text-align: left;
}

.device-row.active,
.device-row:hover {
  border-color: rgba(29, 143, 255, 0.78);
  box-shadow: inset 0 0 18px rgba(29, 143, 255, 0.12);
}

.device-name {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-temp {
  color: #9ed2ff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
