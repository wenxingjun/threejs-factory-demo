<template>
  <aside class="right-panel">
    <section class="panel block">
      <div class="panel-title">数据统计</div>
      <div class="kpi-grid">
        <div class="kpi">
          <span>今日任务</span>
          <strong>{{ todayTasks }}</strong>
        </div>
        <div class="kpi">
          <span>AGV数量</span>
          <strong>{{ agvs.length }}</strong>
        </div>
        <div class="kpi">
          <span>告警统计</span>
          <strong>{{ alarms.length }}</strong>
        </div>
        <div class="kpi">
          <span>电力消耗</span>
          <strong>{{ powerConsumption.toFixed(0) }}kW</strong>
        </div>
      </div>
      <DataCharts class="charts-host" :devices="devices" :alarms="alarms" :temperature-trend="temperatureTrend" />
    </section>

    <section class="panel block">
      <div class="panel-title">AGV信息</div>
      <div class="agv-list">
        <div v-for="agv in agvs" :key="agv.id" class="agv-card">
          <div class="agv-head">
            <strong>{{ agv.id }}</strong>
            <ElTag size="small" :type="tagType(agv.state)">{{ agv.state }}</ElTag>
          </div>
          <p>{{ agv.task }}</p>
          <ElProgress :percentage="Math.round(agv.battery)" :stroke-width="7" :show-text="false" />
          <div class="agv-foot">
            <span>电量 {{ agv.battery.toFixed(1) }}%</span>
            <span>{{ agv.speed.toFixed(2) }}m/s</span>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import DataCharts from '@/components/charts/DataCharts.vue';
import { ElProgress, ElTag } from 'element-plus';
import 'element-plus/es/components/progress/style/css';
import 'element-plus/es/components/tag/style/css';
import type { AGVState, AGVTelemetry, DeviceTelemetry, FactoryAlarm } from '@/types/factory';

defineProps<{
  devices: DeviceTelemetry[];
  agvs: AGVTelemetry[];
  alarms: FactoryAlarm[];
  todayTasks: number;
  powerConsumption: number;
  temperatureTrend: number[];
}>();

const tagType = (state: AGVState) => {
  if (state === 'error') return 'danger';
  if (state === 'charging' || state === 'loading') return 'warning';
  if (state === 'moving') return 'success';
  return 'info';
};
</script>

<style scoped>
.right-panel {
  position: absolute;
  top: 92px;
  right: 18px;
  bottom: 126px;
  z-index: 3;
  display: grid;
  width: 348px;
  grid-template-rows: minmax(0, 1.12fr) minmax(0, 1fr);
  gap: 14px;
}

.block {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px;
  overflow: hidden;
}

.kpi-grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.kpi {
  padding: 9px 10px;
  border: 1px solid rgba(111, 183, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.kpi span {
  display: block;
  color: #83add0;
  font-size: 12px;
}

.kpi strong {
  display: block;
  margin-top: 3px;
  color: #eef8ff;
  font-size: 21px;
  font-variant-numeric: tabular-nums;
}

.charts-host {
  flex: 1;
  min-height: 0;
}

.agv-list {
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

.agv-list::-webkit-scrollbar {
  width: 5px;
}

.agv-list::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(104, 200, 255, 0.42);
}

.agv-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.agv-card {
  flex: 0 0 auto;
  padding: 11px;
  border: 1px solid rgba(111, 183, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.agv-head,
.agv-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agv-head strong {
  color: #dcecff;
  font-size: 14px;
}

.agv-card p {
  margin: 6px 0 8px;
  color: #87b3d8;
  font-size: 12px;
}

.agv-foot {
  margin-top: 7px;
  color: #9ec5e5;
  font-size: 12px;
}
</style>
