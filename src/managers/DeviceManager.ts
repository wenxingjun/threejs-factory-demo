import * as THREE from 'three';
import type { DeviceStatus, DeviceTelemetry, SceneDeviceBinding } from '@/types/factory';

const statusColor: Record<DeviceStatus, number> = {
  running: 0x39f5b6,
  warning: 0xffc857,
  error: 0xff4d6d,
  offline: 0x6d7c8d
};

export class DeviceManager {
  readonly group = new THREE.Group();
  private readonly bindings = new Map<string, SceneDeviceBinding>();
  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  constructor(devices: DeviceTelemetry[]) {
    this.group.name = 'DeviceManager';
    devices.forEach((device) => this.createDevice(device));
  }

  getInteractiveObjects(): THREE.Object3D[] {
    // Raycaster 只检测设备根节点，命中后再向上回溯 deviceId。
    return Array.from(this.bindings.values()).map((binding) => binding.mesh);
  }

  updateTelemetry(device: DeviceTelemetry): void {
    const binding = this.bindings.get(device.id);
    if (!binding) {
      this.createDevice(device);
      return;
    }
    binding.telemetry = device;
    this.applyStatus(binding.mesh, device.status, device.id === this.selectedId || device.id === this.hoveredId);
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.refreshVisualState();
  }

  setHovered(id: string | null): void {
    this.hoveredId = id;
    this.refreshVisualState();
  }

  getDeviceByObject(object: THREE.Object3D): DeviceTelemetry | null {
    let current: THREE.Object3D | null = object;
    // 子 Mesh 被命中时，通过父级链路找到绑定的业务设备。
    while (current) {
      const id = current.userData.deviceId as string | undefined;
      if (id && this.bindings.has(id)) {
        return this.bindings.get(id)!.telemetry;
      }
      current = current.parent;
    }
    return null;
  }

  update(delta: number): void {
    this.bindings.forEach((binding) => {
      const ring = binding.mesh.userData.ring as THREE.Mesh | undefined;
      if (!ring) return;
      ring.rotation.z += delta * 0.8;
      const status = binding.telemetry.status;
      // 异常状态使用更强的透明度脉冲，便于在大屏场景中快速定位。
      const pulse = status === 'warning' || status === 'error' ? 0.65 + Math.sin(performance.now() * 0.006) * 0.25 : 0.35;
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = pulse;
    });
  }

  dispose(): void {
    this.bindings.forEach((binding) => {
      binding.mesh.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
    });
    this.bindings.clear();
  }

  private createDevice(device: DeviceTelemetry): void {
    const color = statusColor[device.status];
    const root = new THREE.Group();
    root.name = device.id;
    root.position.set(device.position.x, device.position.y, device.position.z);
    root.userData = { type: 'device', deviceId: device.id };

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.82, 0.12, 28),
      new THREE.MeshStandardMaterial({ color: 0x152338, metalness: 0.65, roughness: 0.35 })
    );
    base.position.y = 0.06;
    base.receiveShadow = true;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 0.82),
      new THREE.MeshStandardMaterial({
        color: 0x1b3554,
        metalness: 0.58,
        roughness: 0.24,
        emissive: color,
        emissiveIntensity: 0.12
      })
    );
    body.position.y = 0.72;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { type: 'device', deviceId: device.id };

    const light = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 0.08, 0.86),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
    );
    light.position.y = 1.32;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 0.93, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    root.userData.ring = ring;

    root.add(base, body, light, ring);
    this.applyStatus(root, device.status, false);
    this.bindings.set(device.id, { mesh: root, telemetry: device });
    this.group.add(root);
  }

  private refreshVisualState(): void {
    this.bindings.forEach((binding, id) => {
      this.applyStatus(binding.mesh, binding.telemetry.status, id === this.selectedId || id === this.hoveredId);
    });
  }

  private applyStatus(root: THREE.Object3D, status: DeviceStatus, active: boolean): void {
    const color = statusColor[status];
    // 状态统一映射到材质颜色与 emissive 强度，保证 UI 与 3D 语义一致。
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if ('emissive' in material && material.emissive) {
        material.emissive.setHex(color);
        material.emissiveIntensity = status === 'offline' ? 0.02 : active ? 0.42 : 0.16;
      }
      if ('color' in material && mesh.geometry.type !== 'BoxGeometry') {
        material.color.setHex(color);
      }
    });
    const scale = active ? 1.08 : 1;
    root.scale.set(scale, scale, scale);
  }
}
