<template>
  <div class="chart-grid">
    <div ref="onlineRef" class="chart"></div>
    <div ref="alarmRef" class="chart"></div>
    <div ref="powerRef" class="chart wide"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts/core';
import { GaugeChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { DeviceTelemetry, FactoryAlarm } from '@/types/factory';

echarts.use([CanvasRenderer, GaugeChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent]);

const props = defineProps<{
  devices: DeviceTelemetry[];
  alarms: FactoryAlarm[];
  temperatureTrend: number[];
}>();

const onlineRef = ref<HTMLDivElement | null>(null);
const alarmRef = ref<HTMLDivElement | null>(null);
const powerRef = ref<HTMLDivElement | null>(null);
let onlineChart: echarts.ECharts | null = null;
let alarmChart: echarts.ECharts | null = null;
let powerChart: echarts.ECharts | null = null;

const onlineRate = computed(() => {
  if (!props.devices.length) return 0;
  return Math.round((props.devices.filter((device) => device.status !== 'offline').length / props.devices.length) * 100);
});

const warningCount = computed(() => props.devices.filter((device) => device.status === 'warning').length);
const errorCount = computed(() => props.devices.filter((device) => device.status === 'error').length);

const chartText = {
  color: '#b7d9f6',
  fontFamily: 'Microsoft YaHei'
};

const renderCharts = () => {
  // 所有图表由同一份实时状态驱动，避免 UI 指标与 3D 场景数据脱节。
  onlineChart?.setOption({
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        radius: '88%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.65, '#ff4d6d'],
              [0.85, '#ffc857'],
              [1, '#39f5b6']
            ]
          }
        },
        pointer: { width: 4, itemStyle: { color: '#68c8ff' } },
        axisTick: { show: false },
        splitLine: { distance: -14, length: 8, lineStyle: { color: '#6fa8d6' } },
        axisLabel: { ...chartText, distance: 14, fontSize: 10 },
        detail: { valueAnimation: true, formatter: '{value}%', color: '#eef8ff', fontSize: 22, offsetCenter: [0, '62%'] },
        title: { show: true, offsetCenter: [0, '34%'], color: '#7eaed6', fontSize: 12 },
        data: [{ value: onlineRate.value, name: '在线率' }]
      }
    ]
  });

  alarmChart?.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: chartText, itemWidth: 9, itemHeight: 9 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '72%'],
        center: ['50%', '43%'],
        label: { show: false },
        data: [
          { value: warningCount.value, name: '预警', itemStyle: { color: '#ffc857' } },
          { value: errorCount.value, name: '故障', itemStyle: { color: '#ff4d6d' } },
          { value: Math.max(0, props.alarms.length - warningCount.value - errorCount.value), name: '提示', itemStyle: { color: '#68c8ff' } }
        ]
      }
    ]
  });

  powerChart?.setOption({
    grid: { left: 28, right: 10, top: 22, bottom: 24 },
    xAxis: {
      type: 'category',
      data: props.temperatureTrend.map((_, index) => `${index + 1}h`),
      axisLine: { lineStyle: { color: '#244b6c' } },
      axisLabel: { ...chartText, fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(111, 183, 255, 0.12)' } },
      axisLabel: { ...chartText, fontSize: 10 }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: props.temperatureTrend,
        symbolSize: 6,
        lineStyle: { width: 3, color: '#1d8fff' },
        itemStyle: { color: '#4dffb5' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(29,143,255,0.36)' },
            { offset: 1, color: 'rgba(29,143,255,0.02)' }
          ])
        }
      }
    ]
  });
};

const resizeCharts = () => {
  // 侧栏高度会随视口变化，ECharts 需要主动 resize 才能保持清晰布局。
  onlineChart?.resize();
  alarmChart?.resize();
  powerChart?.resize();
};

onMounted(async () => {
  await nextTick();
  onlineChart = echarts.init(onlineRef.value!);
  alarmChart = echarts.init(alarmRef.value!);
  powerChart = echarts.init(powerRef.value!);
  renderCharts();
  window.addEventListener('resize', resizeCharts);
});

watch(() => [props.devices, props.alarms, props.temperatureTrend], renderCharts, { deep: true });

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  onlineChart?.dispose();
  alarmChart?.dispose();
  powerChart?.dispose();
});
</script>

<style scoped>
.chart-grid {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(108px, 1fr) minmax(118px, 1fr);
  gap: 10px;
}

.chart {
  height: auto;
  min-height: 0;
  min-width: 0;
  border: 1px solid rgba(111, 183, 255, 0.14);
  background: rgba(255, 255, 255, 0.035);
}

.wide {
  grid-column: 1 / -1;
}
</style>
