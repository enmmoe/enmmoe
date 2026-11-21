import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface LoadedGltfCharacter {
  scene: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  playClip: (clipName: string, fadeSeconds?: number) => boolean;
  setMorphTarget: (targetName: string, weight: number) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Upgrade pipeline for authored Blender / Unreal MetaHuman-lite `.glb` character assets
 * with Draco mesh compression, skeletal AnimationMixer crossfading, and facial morph targets.
 */
export async function loadMetaHumanGltfCharacter(
  glbUrl: string,
  dracoDecoderPath?: string
): Promise<LoadedGltfCharacter> {
  const loader = new GLTFLoader();
  let draco: DRACOLoader | null = null;
  if (dracoDecoderPath) {
    draco = new DRACOLoader();
    draco.setDecoderPath(dracoDecoderPath);
    loader.setDRACOLoader(draco);
  }

  const gltf: GLTF = await loader.loadAsync(glbUrl);
  const root = gltf.scene;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  const mixer = new THREE.AnimationMixer(root);
  const actions: Record<string, THREE.AnimationAction> = {};
  gltf.animations.forEach((clip) => {
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  });

  let activeAction: THREE.AnimationAction | null = null;
  const firstAction = Object.values(actions)[0];
  if (firstAction) {
    firstAction.play();
    activeAction = firstAction;
  }

  return {
    scene: root,
    mixer,
    actions,
    playClip: (clipName: string, fadeSeconds = 0.28) => {
      const target = actions[clipName.toLowerCase()];
      if (!target) return false;
      if (activeAction && activeAction !== target) {
        activeAction.crossFadeTo(target, fadeSeconds, true);
      }
      target.reset().play();
      activeAction = target;
      return true;
    },
    setMorphTarget: (targetName: string, weight: number) => {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const idx = mesh.morphTargetDictionary[targetName];
          if (typeof idx === 'number') {
            mesh.morphTargetInfluences[idx] = THREE.MathUtils.clamp(weight, 0, 1);
          }
        }
      });
    },
    update: (delta: number) => mixer.update(delta),
    dispose: () => {
      mixer.stopAllAction();
      draco?.dispose();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => mat.dispose());
        }
      });
    },
  };
}
