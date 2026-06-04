import { defineStore } from 'pinia';
import type { AGVTelemetry, DeviceTelemetry, FactoryAlarm, FactoryLog, FactorySnapshot } from '@/types/factory';

interface FactoryState extends FactorySnapshot {
  selectedDeviceId: string | null;
  connected: boolean;
}

export const useFactoryStore = defineStore('factory', {
  state: (): FactoryState => ({
    devices: [],
    agvs: [],
    alarms: [],
    logs: [],
    todayTasks: 126,
    powerConsumption: 2480,
    temperatureTrend: [42, 43, 44, 43, 45, 46, 44, 47],
    selectedDeviceId: null,
    connected: false
  }),
  getters: {
    onlineDeviceCount: (state) => state.devices.filter((device) => device.status !== 'offline').length,
    warningDeviceCount: (state) => state.devices.filter((device) => device.status === 'warning').length,
    errorDeviceCount: (state) => state.devices.filter((device) => device.status === 'error').length,
    onlineRate: (state) => {
      if (!state.devices.length) return 0;
      return Math.round((state.devices.filter((device) => device.status !== 'offline').length / state.devices.length) * 100);
    },
    selectedDevice: (state): DeviceTelemetry | null =>
      state.devices.find((device) => device.id === state.selectedDeviceId) ?? null
  },
  actions: {
    setConnected(connected: boolean) {
      this.connected = connected;
    },
    applySnapshot(snapshot: FactorySnapshot) {
      this.devices = snapshot.devices;
      this.agvs = snapshot.agvs;
      this.alarms = snapshot.alarms;
      this.logs = snapshot.logs;
      this.todayTasks = snapshot.todayTasks;
      this.powerConsumption = snapshot.powerConsumption;
      this.temperatureTrend = snapshot.temperatureTrend;
    },
    updateDevice(payload: DeviceTelemetry) {
      const index = this.devices.findIndex((device) => device.id === payload.id);
      if (index >= 0) {
        this.devices[index] = payload;
      } else {
        this.devices.push(payload);
      }
    },
    updateAgv(payload: AGVTelemetry) {
      const index = this.agvs.findIndex((agv) => agv.id === payload.id);
      if (index >= 0) {
        this.agvs[index] = payload;
      } else {
        this.agvs.push(payload);
      }
    },
    pushAlarm(alarm: FactoryAlarm) {
      this.alarms = [alarm, ...this.alarms].slice(0, 8);
    },
    pushLog(log: FactoryLog) {
      this.logs = [log, ...this.logs].slice(0, 12);
    },
    selectDevice(id: string | null) {
      this.selectedDeviceId = id;
    }
  }
});
