import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeObject3D } from '@/utils/dispose';

export interface ModelLoadOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  scale?: number | THREE.Vector3;
}

export class ModelManager {
  private readonly gltfLoader: GLTFLoader;
  private readonly dracoLoader: DRACOLoader;
  private readonly ktx2Loader: KTX2Loader;
  private readonly cache = new Map<string, Promise<GLTF>>();
  private readonly instances = new Set<THREE.Object3D>();

  constructor(renderer?: THREE.WebGLRenderer) {
    // Draco 与 KTX2 解码器路径来自 public/，用于真实 glb/gltf 资产接入时复用。
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });

    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/basis/');
    if (renderer) {
      this.ktx2Loader.detectSupport(renderer);
    }

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.gltfLoader.setKTX2Loader(this.ktx2Loader);
  }

  load(url: string): Promise<GLTF> {
    if (!this.cache.has(url)) {
      // 缓存 Promise 而不是已完成结果，可以合并同一模型的并发加载请求。
      const request = this.gltfLoader.loadAsync(url).catch((error: unknown) => {
        this.cache.delete(url);
        throw new Error(`模型加载失败：${url}，${String(error)}`);
      });
      this.cache.set(url, request);
    }
    return this.cache.get(url)!;
  }

  async instantiate(url: string, options: ModelLoadOptions = {}): Promise<THREE.Object3D> {
    const gltf = await this.load(url);
    // 使用 SkeletonUtils.clone 兼容带骨骼动画的模型实例化。
    const model = clone(gltf.scene);
    this.applyRenderOptions(model, options);
    this.instances.add(model);
    return model;
  }

  releaseInstance(object: THREE.Object3D): void {
    disposeObject3D(object);
    this.instances.delete(object);
  }

  clearCache(): void {
    this.instances.forEach((instance) => disposeObject3D(instance));
    this.instances.clear();
    this.cache.clear();
  }

  dispose(): void {
    this.clearCache();
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();
  }

  private applyRenderOptions(object: THREE.Object3D, options: ModelLoadOptions): void {
    if (options.scale) {
      if (typeof options.scale === 'number') {
        object.scale.setScalar(options.scale);
      } else {
        object.scale.copy(options.scale);
      }
    }

    object.traverse((child) => {
      // 开启视锥裁剪，避免不可见模型继续参与渲染提交。
      child.frustumCulled = true;
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = options.castShadow ?? true;
      mesh.receiveShadow = options.receiveShadow ?? true;
    });
  }
}
