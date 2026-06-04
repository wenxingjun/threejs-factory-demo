import type { AGVState, AGVTelemetry, DeviceStatus, DeviceTelemetry, FactoryAlarm, FactoryLog, FactorySnapshot } from '@/types/factory';
import { createId, formatClock } from '@/utils/time';

type FactoryMessage =
  | { type: 'snapshot'; payload: FactorySnapshot }
  | { type: 'device:update'; payload: DeviceTelemetry }
  | { type: 'agv:update'; payload: AGVTelemetry }
  | { type: 'alarm'; payload: FactoryAlarm }
  | { type: 'log'; payload: FactoryLog };

type MessageHandler = (message: FactoryMessage) => void;

const devicePositions = [
  { x: -7.8, y: 0, z: -3.6 },
  { x: -4.6, y: 0, z: -3.6 },
  { x: -1.4, y: 0, z: -3.6 },
  { x: 4.8, y: 0, z: -3.6 },
  { x: 7.5, y: 0, z: -2.2 },
  { x: 6.4, y: 0, z: 3.4 },
  { x: 1.8, y: 0, z: 4.4 },
  { x: -5.8, y: 0, z: 4.2 }
];

const statusPool: DeviceStatus[] = ['running', 'running', 'running', 'warning', 'error', 'offline'];
const agvStatePool: AGVState[] = ['moving', 'moving', 'moving', 'loading', 'charging', 'idle'];

export class WebSocketService {
  private handlers = new Set<MessageHandler>();
  private timer: number | null = null;
  private devices: DeviceTelemetry[] = [];
  private agvs: AGVTelemetry[] = [];
  private alarms: FactoryAlarm[] = [];
  private logs: FactoryLog[] = [];
  private tick = 0;

  connect(): void {
    // 当前实现是前端模拟通道；替换为真实 WebSocket 时保留消息结构即可。
    this.devices = this.createDevices();
    this.agvs = this.createAgvs();
    this.alarms = [
      this.createAlarm('warning', 'CAM-04', '仓储区摄像头出现短时抖动'),
      this.createAlarm('info', 'AGV-02', '机器人完成 A-17 物料转运任务')
    ];
    this.logs = [
      this.createLog('WebSocket 通道已建立，开始接收 IoT 数据'),
      this.createLog('产线节拍监测模块启动')
    ];
    this.emit({
      type: 'snapshot',
      payload: this.createSnapshot()
    });
    window.clearInterval(this.timer ?? undefined);
    this.timer = window.setInterval(() => this.simulateTick(), 1400);
  }

  disconnect(): void {
    window.clearInterval(this.timer ?? undefined);
    this.timer = null;
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    // 返回取消订阅函数，组件卸载时避免重复推送和内存泄漏。
    return () => this.handlers.delete(handler);
  }

  private simulateTick(): void {
    this.tick += 1;
    // 每个 tick 随机扰动一台设备，模拟 IoT 高频但局部变化的数据流。
    const deviceIndex = Math.floor(Math.random() * this.devices.length);
    const current = this.devices[deviceIndex];
    const drift = Math.random() * 4 - 1.5;
    const status = Math.random() > 0.82 ? this.randomStatus() : current.status;
    const warning = status === 'warning' ? '温度接近阈值' : status === 'error' ? '驱动模块异常' : null;
    const device: DeviceTelemetry = {
      ...current,
      status,
      warning,
      temperature: Math.max(22, Math.min(92, Number((current.temperature + drift).toFixed(1)))),
      power: Math.max(0, Number((current.power + Math.random() * 12 - 4).toFixed(1)))
    };
    this.devices[deviceIndex] = device;
    this.emit({ type: 'device:update', payload: device });

    this.agvs = this.agvs.map((agv, index) => {
      // AGV 状态由调度系统推送，本地 3D 控制器只负责按状态表现。
      const state = Math.random() > 0.9 ? agvStatePool[Math.floor(Math.random() * agvStatePool.length)] : agv.state;
      const batteryDelta = state === 'charging' ? 2.8 : -0.8 - Math.random() * 0.7;
      const next: AGVTelemetry = {
        ...agv,
        state,
        battery: Math.max(8, Math.min(100, Number((agv.battery + batteryDelta).toFixed(1)))),
        progress: (agv.progress + 4 + index * 1.2) % 100
      };
      this.emit({ type: 'agv:update', payload: next });
      return next;
    });

    if (device.warning && Math.random() > 0.45) {
      const alarm = this.createAlarm(device.status === 'error' ? 'critical' : 'warning', device.id, `${device.name}${device.warning}`);
      this.alarms = [alarm, ...this.alarms].slice(0, 8);
      this.emit({ type: 'alarm', payload: alarm });
    }

    if (this.tick % 2 === 0) {
      const log = this.createLog(`${device.name} 数据刷新：${device.temperature.toFixed(1)}℃ / ${device.power.toFixed(1)}kW`);
      this.logs = [log, ...this.logs].slice(0, 12);
      this.emit({ type: 'log', payload: log });
    }
  }

  private createSnapshot(): FactorySnapshot {
    return {
      devices: this.devices,
      agvs: this.agvs,
      alarms: this.alarms,
      logs: this.logs,
      todayTasks: 126 + Math.floor(Math.random() * 18),
      powerConsumption: 2480 + Math.floor(Math.random() * 120),
      temperatureTrend: Array.from({ length: 8 }, (_, index) => 40 + index + Math.round(Math.random() * 5))
    };
  }

  private createDevices(): DeviceTelemetry[] {
    const names = ['冲压机组 A1', 'CNC 加工中心', '焊接工作站', '机械臂 R7', '视觉检测台', '高位货架', '能源柜', '边缘网关'];
    const zones = ['工业设备区', '工业设备区', '工业设备区', '机械臂区域', '摄像头区域', '仓储区', '数据看板区域', '数据看板区域'];
    return names.map((name, index) => ({
      id: `DEV-${String(index + 1).padStart(2, '0')}`,
      name,
      zone: zones[index],
      status: index === 2 ? 'warning' : index === 7 ? 'offline' : 'running',
      temperature: 38 + index * 3 + Math.random() * 3,
      power: 38 + index * 7 + Math.random() * 5,
      warning: index === 2 ? '焊接温度波动' : null,
      position: devicePositions[index]
    }));
  }

  private createAgvs(): AGVTelemetry[] {
    return ['AGV-01', 'AGV-02', 'AGV-03'].map((id, index) => ({
      id,
      name: `运输机器人 ${index + 1}`,
      state: 'moving',
      battery: 86 - index * 13,
      speed: 0.34 + index * 0.04,
      task: index === 0 ? '原料配送' : index === 1 ? '成品入库' : '工装回收',
      progress: index * 30,
      position: { x: 0, y: 0, z: 0 }
    }));
  }

  private randomStatus(): DeviceStatus {
    return statusPool[Math.floor(Math.random() * statusPool.length)];
  }

  private createAlarm(level: FactoryAlarm['level'], source: string, message: string): FactoryAlarm {
    return {
      id: createId('alarm'),
      level,
      source,
      message,
      time: formatClock()
    };
  }

  private createLog(message: string): FactoryLog {
    return {
      id: createId('log'),
      time: formatClock(),
      message
    };
  }

  private emit(message: FactoryMessage): void {
    // 统一出口便于后续增加日志、重连或消息节流策略。
    this.handlers.forEach((handler) => handler(message));
  }
}

export const websocketService = new WebSocketService();
