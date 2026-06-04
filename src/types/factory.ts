import type * as THREE from 'three';

export type AGVState = 'idle' | 'moving' | 'loading' | 'charging' | 'error';
export type DeviceStatus = 'running' | 'warning' | 'error' | 'offline';

export interface VectorPoint {
  x: number;
  y: number;
  z: number;
}

export interface AGVTelemetry {
  id: string;
  name: string;
  state: AGVState;
  battery: number;
  speed: number;
  task: string;
  progress: number;
  position: VectorPoint;
}

export interface DeviceTelemetry {
  id: string;
  name: string;
  zone: string;
  status: DeviceStatus;
  temperature: number;
  power: number;
  warning: string | null;
  position: VectorPoint;
}

export interface FactoryAlarm {
  id: string;
  level: 'info' | 'warning' | 'critical';
  source: string;
  message: string;
  time: string;
}

export interface FactoryLog {
  id: string;
  time: string;
  message: string;
}

export interface FactorySnapshot {
  devices: DeviceTelemetry[];
  agvs: AGVTelemetry[];
  alarms: FactoryAlarm[];
  logs: FactoryLog[];
  todayTasks: number;
  powerConsumption: number;
  temperatureTrend: number[];
}

export interface SceneDeviceBinding {
  mesh: THREE.Object3D;
  telemetry: DeviceTelemetry;
}
