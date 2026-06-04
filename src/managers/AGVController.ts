import * as THREE from 'three';
import type { AGVState, AGVTelemetry } from '@/types/factory';

export interface AGVRuntimeOptions {
  id: string;
  name: string;
  path: THREE.Vector3[];
  speed: number;
  color: number;
  initialOffset?: number;
}

export class AGVController {
  readonly id: string;
  readonly name: string;
  readonly group = new THREE.Group();

  private readonly curve: THREE.CatmullRomCurve3;
  private readonly speed: number;
  private readonly telemetry: AGVTelemetry;
  private readonly targetQuaternion = new THREE.Quaternion();
  private progress = 0;
  private state: AGVState = 'moving';
  private paused = false;

  constructor(options: AGVRuntimeOptions) {
    this.id = options.id;
    this.name = options.name;
    // 闭合 CatmullRom 曲线作为巡航轨道，progress 在 0-1 区间循环推进。
    this.curve = new THREE.CatmullRomCurve3(options.path, true, 'catmullrom', 0.12);
    this.speed = options.speed;
    this.progress = options.initialOffset ?? 0;
    this.telemetry = {
      id: options.id,
      name: options.name,
      state: 'moving',
      battery: 92,
      speed: options.speed,
      task: '路径巡航',
      progress: this.progress * 100,
      position: { x: 0, y: 0, z: 0 }
    };
    this.group.name = options.id;
    this.group.userData = { type: 'agv', id: options.id };
    this.createMesh(options.color);
    this.updateTransform(0);
  }

  update(delta: number): AGVTelemetry {
    if (!this.paused && this.state === 'moving') {
      // 仅 moving 状态推进路径，loading/charging/error 会保持当前位置。
      this.progress = (this.progress + delta * this.speed) % 1;
    }
    this.updateTransform(delta);
    this.telemetry.state = this.state;
    this.telemetry.progress = Number((this.progress * 100).toFixed(1));
    this.telemetry.position = {
      x: Number(this.group.position.x.toFixed(2)),
      y: Number(this.group.position.y.toFixed(2)),
      z: Number(this.group.position.z.toFixed(2))
    };
    return { ...this.telemetry };
  }

  applyTelemetry(telemetry: Partial<AGVTelemetry>): void {
    if (telemetry.state) {
      // 外部实时数据可以覆盖本地状态机，用于模拟调度系统接管。
      this.state = telemetry.state;
      this.paused = telemetry.state !== 'moving';
    }
    if (telemetry.battery !== undefined) {
      this.telemetry.battery = telemetry.battery;
    }
    if (telemetry.task) {
      this.telemetry.task = telemetry.task;
    }
  }

  pause(): void {
    this.paused = true;
    this.state = 'idle';
  }

  resume(): void {
    this.paused = false;
    this.state = 'moving';
  }

  setState(state: AGVState): void {
    this.state = state;
    this.paused = state !== 'moving';
  }

  getTelemetry(): AGVTelemetry {
    return { ...this.telemetry };
  }

  private createMesh(color: number): void {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.28, 0.62),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.55,
        roughness: 0.28,
        emissive: color,
        emissiveIntensity: 0.14
      })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.28;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.18, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x10263e,
        metalness: 0.5,
        roughness: 0.2,
        emissive: 0x00d7ff,
        emissiveIntensity: 0.18
      })
    );
    top.position.y = 0.53;

    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x4dffb5,
        emissive: 0x4dffb5,
        emissiveIntensity: 1.2
      })
    );
    indicator.position.set(0.36, 0.65, 0);

    this.group.add(body, top, indicator);
  }

  private updateTransform(delta: number): void {
    const position = this.curve.getPointAt(this.progress);
    const next = this.curve.getPointAt((this.progress + 0.004) % 1);
    const direction = next.sub(position).normalize();
    const yaw = Math.atan2(direction.x, direction.z);
    this.targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.group.position.copy(position);
    if (delta <= 0) {
      this.group.quaternion.copy(this.targetQuaternion);
    } else {
      // 使用四元数球面插值，让 AGV 在弯道处平滑转向。
      this.group.quaternion.slerp(this.targetQuaternion, Math.min(1, delta * 6));
    }
  }
}
