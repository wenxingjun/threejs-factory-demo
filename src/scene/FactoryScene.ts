import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { AGVController } from '@/managers/AGVController';
import { DeviceManager } from '@/managers/DeviceManager';
import { ModelManager } from '@/three/ModelManager';
import type { AGVTelemetry, DeviceTelemetry } from '@/types/factory';

interface FactorySceneOptions {
  container: HTMLElement;
  devices: DeviceTelemetry[];
  onDeviceSelect?: (device: DeviceTelemetry | null) => void;
  onDeviceHover?: (device: DeviceTelemetry | null) => void;
}

export class FactoryScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  private readonly container: HTMLElement;
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly fxaaPass: ShaderPass;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly modelManager: ModelManager;
  private readonly deviceManager: DeviceManager;
  private readonly agvs: AGVController[] = [];
  private readonly onDeviceSelect?: (device: DeviceTelemetry | null) => void;
  private readonly onDeviceHover?: (device: DeviceTelemetry | null) => void;
  private frameId = 0;
  private hoveredDeviceId: string | null = null;

  constructor(options: FactorySceneOptions) {
    this.container = options.container;
    this.onDeviceSelect = options.onDeviceSelect;
    this.onDeviceHover = options.onDeviceHover;

    // 低俯视角更接近工业数字孪生大屏的观察方式。
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.camera.position.set(10.5, 8.2, 11.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x07111f, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.modelManager = new ModelManager(this.renderer);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 24;
    this.controls.target.set(0, 0.4, 0);

    // 后期链路：基础渲染 -> Bloom 强化发光材质 -> FXAA 抗锯齿。
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.92, 0.42, 0.18);
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);
    this.composer.addPass(this.fxaaPass);

    this.deviceManager = new DeviceManager(options.devices);
    this.scene.add(this.deviceManager.group);

    this.configureScene();
    this.createFactoryLayout();
    this.createAgvSystem();
    this.bindEvents();
    this.resize();
  }

  start(): void {
    this.clock.start();
    // 所有动画与场景联动统一在 requestAnimationFrame 生命周期内推进。
    this.frameId = window.requestAnimationFrame(() => this.animate());
  }

  stop(): void {
    window.cancelAnimationFrame(this.frameId);
  }

  updateDevice(device: DeviceTelemetry): void {
    this.deviceManager.updateTelemetry(device);
  }

  updateAgv(telemetry: AGVTelemetry): void {
    const agv = this.agvs.find((item) => item.id === telemetry.id);
    agv?.applyTelemetry(telemetry);
  }

  resize(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    const pixelRatio = this.renderer.getPixelRatio();
    // FXAA 依赖真实像素分辨率，Resize 时需要同步更新 resolution uniform。
    this.fxaaPass.material.uniforms.resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.controls.dispose();
    this.deviceManager.dispose();
    this.modelManager.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private configureScene(): void {
    this.scene.background = new THREE.Color(0x07111f);
    this.scene.fog = new THREE.Fog(0x07111f, 20, 42);

    // 半球光提供整体环境照明，方向光负责主体阴影层次。
    const hemisphere = new THREE.HemisphereLight(0x6fb7ff, 0x07111f, 1.4);
    this.scene.add(hemisphere);

    const directional = new THREE.DirectionalLight(0xe8f7ff, 2.4);
    directional.position.set(8, 13, 8);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.left = -14;
    directional.shadow.camera.right = 14;
    directional.shadow.camera.top = 14;
    directional.shadow.camera.bottom = -14;
    this.scene.add(directional);

    [
      { position: [-8, 3, -6], color: 0x00d7ff },
      { position: [7, 3.5, 5], color: 0x44ffbd },
      { position: [0, 4.5, -7], color: 0xffc857 }
    ].forEach((light) => {
      const point = new THREE.PointLight(light.color, 1.8, 10, 2);
      point.position.fromArray(light.position);
      this.scene.add(point);
    });
  }

  private createFactoryLayout(): void {
    // 场景规模保持紧凑，保证作品集展示时首屏信息密度和运行帧率。
    this.createFloor();
    this.createZone(-4.8, -3.7, 6.4, 3.4, 0x1d8fff, '工业设备区');
    this.createZone(5.5, -3.4, 4.6, 3.2, 0x44ffbd, 'AGV运输区');
    this.createZone(-5.2, 4.2, 5.4, 3.4, 0xffc857, '仓储区');
    this.createZone(4.4, 3.8, 5.2, 3.2, 0xff5f7a, '机械臂区域');
    this.createWarehouse();
    this.createRoboticArm(new THREE.Vector3(4.6, 0, 4.2));
    this.createCameraPoles();
    this.createDataBoard();
    this.createConveyor();
  }

  private createFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.MeshStandardMaterial({
        color: 0x0b1728,
        metalness: 0.42,
        roughness: 0.56
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(18, 36, 0x1d8fff, 0x17334e);
    grid.position.y = 0.012;
    this.scene.add(grid);

    // 地面发光砖使用 InstancedMesh，减少重复几何的 draw call。
    const tileGeometry = new THREE.BoxGeometry(0.36, 0.012, 0.36);
    const tileMaterial = new THREE.MeshBasicMaterial({ color: 0x102c45, transparent: true, opacity: 0.38 });
    const instancedTiles = new THREE.InstancedMesh(tileGeometry, tileMaterial, 180);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let x = -8.5; x <= 8.5; x += 1.3) {
      for (let z = -5.5; z <= 5.5; z += 1.3) {
        matrix.makeTranslation(x, 0.025, z);
        instancedTiles.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    instancedTiles.count = index;
    instancedTiles.frustumCulled = true;
    this.scene.add(instancedTiles);
  }

  private createZone(x: number, z: number, width: number, depth: number, color: number, label: string): void {
    const area = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    );
    area.rotation.x = -Math.PI / 2;
    area.position.set(x, 0.035, z);
    this.scene.add(area);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.04, depth)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.74 })
    );
    border.position.set(x, 0.06, z);
    this.scene.add(border);

    const sprite = this.createTextSprite(label, color);
    sprite.position.set(x - width / 2 + 1.1, 0.32, z - depth / 2 + 0.25);
    this.scene.add(sprite);
  }

  private createWarehouse(): void {
    const geometry = new THREE.BoxGeometry(0.74, 0.68, 0.74);
    const material = new THREE.MeshStandardMaterial({
      color: 0x283a4c,
      metalness: 0.34,
      roughness: 0.45,
      emissive: 0xffc857,
      emissiveIntensity: 0.05
    });
    // 仓储货箱同样使用实例化渲染，后续可扩展为真实库存数据映射。
    const crates = new THREE.InstancedMesh(geometry, material, 24);
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        for (let level = 0; level < 2; level += 1) {
          matrix.makeTranslation(-7 + column * 1.1, 0.36 + level * 0.72, 3.25 + row * 0.92);
          crates.setMatrixAt(index, matrix);
          index += 1;
        }
      }
    }
    crates.castShadow = true;
    crates.receiveShadow = true;
    crates.frustumCulled = true;
    this.scene.add(crates);
  }

  private createRoboticArm(position: THREE.Vector3): void {
    const group = new THREE.Group();
    group.position.copy(position);
    const material = new THREE.MeshStandardMaterial({
      color: 0x244360,
      metalness: 0.72,
      roughness: 0.24,
      emissive: 0x1d8fff,
      emissiveIntensity: 0.08
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.32, 32), material);
    base.position.y = 0.16;
    const armA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.5, 0.34), material);
    armA.position.set(0, 0.98, 0);
    armA.rotation.z = -0.35;
    const armB = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.24, 0.28), material);
    armB.position.set(0.58, 1.75, 0);
    armB.rotation.z = 0.88;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.46), material);
    head.position.set(1.12, 1.42, 0);
    group.add(base, armA, armB, head);
    group.traverse((item) => {
      const mesh = item as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this.scene.add(group);
  }

  private createCameraPoles(): void {
    [
      new THREE.Vector3(-8.2, 0, -5.1),
      new THREE.Vector3(8.2, 0, -5.1),
      new THREE.Vector3(8.2, 0, 5.1)
    ].forEach((position, index) => {
      const group = new THREE.Group();
      group.position.copy(position);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x6d7c8d, metalness: 0.7, roughness: 0.25 })
      );
      pole.position.y = 1.05;
      const camera = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.24, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x14263c, emissive: 0x00d7ff, emissiveIntensity: 0.18 })
      );
      camera.position.set(index === 0 ? 0.25 : -0.25, 2.15, 0);
      camera.lookAt(0, 1, 0);
      group.add(pole, camera);
      this.scene.add(group);
    });
  }

  private createDataBoard(): void {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.2, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x08203a,
        metalness: 0.35,
        roughness: 0.18,
        emissive: 0x00d7ff,
        emissiveIntensity: 0.22
      })
    );
    board.position.set(1.5, 1.35, -5.65);
    this.scene.add(board);
    const sprite = this.createTextSprite('OEE 86.7% / ENERGY 2.5MW', 0x4dffb5, 320, 80);
    sprite.position.set(1.5, 1.35, -5.72);
    sprite.scale.set(2.0, 0.5, 1);
    this.scene.add(sprite);
  }

  private createConveyor(): void {
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x203852, metalness: 0.62, roughness: 0.32 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 0.7), railMaterial);
    belt.position.set(-3.8, 0.16, -1.5);
    belt.castShadow = true;
    belt.receiveShadow = true;
    this.scene.add(belt);

    const rollerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.78, 16);
    const rollerMaterial = new THREE.MeshStandardMaterial({ color: 0x6d7c8d, metalness: 0.8, roughness: 0.2 });
    for (let index = 0; index < 9; index += 1) {
      const roller = new THREE.Mesh(rollerGeometry, rollerMaterial);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-6.2 + index * 0.6, 0.32, -1.5);
      this.scene.add(roller);
    }
  }

  private createAgvSystem(): void {
    // 多台 AGV 复用同一路网，以 offset 错开初始位置形成调度感。
    const pathA = [
      new THREE.Vector3(4.2, 0.12, -4.6),
      new THREE.Vector3(7.3, 0.12, -2.5),
      new THREE.Vector3(6.7, 0.12, 3.8),
      new THREE.Vector3(0.2, 0.12, 4.9),
      new THREE.Vector3(-6.6, 0.12, 2.5),
      new THREE.Vector3(-5.7, 0.12, -4.5)
    ];
    const palette = [0x00d7ff, 0x4dffb5, 0xffc857];
    for (let index = 0; index < 3; index += 1) {
      const agv = new AGVController({
        id: `AGV-0${index + 1}`,
        name: `运输机器人 ${index + 1}`,
        path: pathA,
        speed: 0.036 + index * 0.008,
        color: palette[index],
        initialOffset: index / 3
      });
      this.agvs.push(agv);
      this.scene.add(agv.group);
    }

    const points = pathA.map((point) => new THREE.Vector3(point.x, 0.05, point.z));
    const curve = new THREE.CatmullRomCurve3(points, true);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(160)),
      new THREE.LineBasicMaterial({ color: 0x00d7ff, transparent: true, opacity: 0.55 })
    );
    this.scene.add(line);
  }

  private createTextSprite(text: string, color: number, width = 256, height = 72): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, width, height);
    context.font = '600 28px Microsoft YaHei, Arial';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.shadowBlur = 16;
    context.shadowColor = context.fillStyle;
    context.fillText(text, 12, height / 2 + 10);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(width / 150, height / 150, 1);
    return sprite;
  }

  private animate(): void {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.controls.update();
    this.deviceManager.update(delta);
    this.agvs.forEach((agv) => agv.update(delta));
    this.composer.render();
    this.frameId = window.requestAnimationFrame(() => this.animate());
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);
  }

  private handleResize = (): void => {
    this.resize();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const device = this.pickDevice(event);
    const id = device?.id ?? null;
    if (id !== this.hoveredDeviceId) {
      this.hoveredDeviceId = id;
      this.deviceManager.setHovered(id);
      this.onDeviceHover?.(device);
      this.renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    }
  };

  private handleClick = (event: PointerEvent): void => {
    const device = this.pickDevice(event);
    this.deviceManager.setSelected(device?.id ?? null);
    this.onDeviceSelect?.(device);
  };

  private pickDevice(event: PointerEvent): DeviceTelemetry | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // 只对设备集合做射线检测，避免场景中地面、路径、装饰物干扰交互。
    const hits = this.raycaster.intersectObjects(this.deviceManager.getInteractiveObjects(), true);
    if (!hits.length) return null;
    return this.deviceManager.getDeviceByObject(hits[0].object);
  }
}
