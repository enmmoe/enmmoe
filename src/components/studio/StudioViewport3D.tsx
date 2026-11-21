import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  CharacterConfig,
  GraphicsQuality,
  StudioCameraPresetId,
  StudioSceneConfig,
  STUDIO_PHOTO_FILTERS,
} from '../../types/characterStudio';
import {
  buildCharacterRig,
  CharacterRig,
  updateCharacterAnimation,
} from '../../studio/characterBuilder';
import {
  buildPropsGroup,
  createStudioLightingRig,
} from '../../studio/environmentBuilder';
import {
  applyWorldAtmosphere,
  buildKoreanDistrictWorld,
  DistrictHotspot,
  DistrictWorldRig,
  updateKoreanDistrictWorld,
} from '../../studio/worldBuilder';

export type StudioViewportMode = 'creator' | 'explore' | 'studio';

export interface StudioViewportHandle {
  captureRawFrame: () => string | null;
  resetCamera: () => void;
  setMoveInput: (x: number, y: number, sprint?: boolean) => void;
  teleportPlayer: (x: number, z: number) => void;
}

interface StudioViewport3DProps {
  character: CharacterConfig;
  sceneConfig: StudioSceneConfig;
  mode: StudioViewportMode;
  quality: GraphicsQuality;
  onNearbyHotspotChange?: (hotspot: DistrictHotspot | null) => void;
}

const _moveForward = new THREE.Vector3();
const _moveRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getCameraGoal(
  preset: StudioCameraPresetId,
  zoomDistance: number,
  heightOffset: number,
  mode: StudioViewportMode,
  isSitting: boolean,
  playerPos: THREE.Vector3
): { pos: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const sitAdjust = isSitting ? -0.26 : 0;
  const px = playerPos.x;
  const py = playerPos.y;
  const pz = playerPos.z;

  if (mode === 'creator') {
    if (preset === 'editorial_portrait') {
      return {
        pos: new THREE.Vector3(px + 0.04, py + 1.54 + sitAdjust * 0.8 + heightOffset * 0.35, pz + Math.min(1.65, zoomDistance * 0.48)),
        target: new THREE.Vector3(px, py + 1.5 + sitAdjust * 0.8 + heightOffset * 0.3, pz),
        fov: 31,
      };
    }
    return {
      pos: new THREE.Vector3(px + 0.22, py + 1.18 + sitAdjust * 0.5 + heightOffset * 0.45, pz + zoomDistance),
      target: new THREE.Vector3(px, py + 1.0 + sitAdjust * 0.5 + heightOffset * 0.35, pz),
      fov: 37,
    };
  }

  if (mode === 'explore') {
    return {
      pos: new THREE.Vector3(px + 0.1, py + 2.05, pz + 4.3),
      target: new THREE.Vector3(px, py + 1.18, pz),
      fov: 44,
    };
  }

  switch (preset) {
    case 'editorial_portrait':
      return {
        pos: new THREE.Vector3(px + 0.14, py + 1.54 + sitAdjust * 0.85 + heightOffset * 0.3, pz + Math.max(1.2, zoomDistance * 0.45)),
        target: new THREE.Vector3(px, py + 1.5 + sitAdjust * 0.85 + heightOffset * 0.2, pz),
        fov: 30,
      };
    case 'full_body':
      return {
        pos: new THREE.Vector3(px + 0.16, py + 1.1 + heightOffset * 0.45, pz + Math.max(2.9, zoomDistance * 1.1)),
        target: new THREE.Vector3(px, py + 0.9 + sitAdjust * 0.45, pz),
        fov: 38,
      };
    case 'low_angle':
      return {
        pos: new THREE.Vector3(px + 0.65, py + 0.56 + heightOffset * 0.4, pz + Math.max(2.3, zoomDistance * 0.92)),
        target: new THREE.Vector3(px, py + 1.08 + sitAdjust * 0.5, pz),
        fov: 40,
      };
    case 'candid_side':
      return {
        pos: new THREE.Vector3(px + 1.65, py + 1.24 + sitAdjust * 0.5 + heightOffset * 0.4, pz + Math.max(2.0, zoomDistance * 0.75)),
        target: new THREE.Vector3(px + 0.04, py + 1.05 + sitAdjust * 0.5, pz),
        fov: 34,
      };
    case 'three_quarter':
    default:
      return {
        pos: new THREE.Vector3(px + 0.85, py + 1.28 + sitAdjust * 0.5 + heightOffset * 0.4, pz + Math.max(2.1, zoomDistance * 0.88)),
        target: new THREE.Vector3(px + 0.04, py + 1.02 + sitAdjust * 0.5, pz),
        fov: 35,
      };
  }
}

export const StudioViewport3D = forwardRef<StudioViewportHandle, StudioViewport3DProps>(
  ({ character, sceneConfig, mode, quality, onNearbyHotspotChange }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [contextError, setContextError] = useState(false);

    const stateRef = useRef({
      character,
      sceneConfig,
      mode,
      quality,
      onNearbyHotspotChange,
    });
    stateRef.current = { character, sceneConfig, mode, quality, onNearbyHotspotChange };

    const inputRef = useRef({
      joyX: 0,
      joyY: 0,
      joySprint: false,
      keys: new Set<string>(),
    });

    const engineRef = useRef<{
      renderer: THREE.WebGLRenderer;
      composer: EffectComposer | null;
      bloomPass: UnrealBloomPass | null;
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      controls: OrbitControls;
      lights: ReturnType<typeof createStudioLightingRig>;
      characterRig: CharacterRig | null;
      worldRig: DistrictWorldRig | null;
      propsRig: ReturnType<typeof buildPropsGroup> | null;
      maxAnisotropy: number;
      isSoftwareGl: boolean;
      cameraTransitionActive: boolean;
      goalPos: THREE.Vector3;
      goalTarget: THREE.Vector3;
      goalFov: number;
      playerPos: THREE.Vector3;
      playerYaw: number;
      lastHotspotId: string | null;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      captureRawFrame: () => {
        const eng = engineRef.current;
        if (!eng) return null;
        if (eng.composer && stateRef.current.quality === 'high' && !eng.isSoftwareGl) {
          eng.composer.render();
        } else {
          eng.renderer.render(eng.scene, eng.camera);
        }
        try {
          return eng.renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
      resetCamera: () => {
        const eng = engineRef.current;
        if (!eng) return;
        const goal = getCameraGoal(
          stateRef.current.sceneConfig.cameraPreset,
          stateRef.current.sceneConfig.zoomDistance,
          stateRef.current.sceneConfig.cameraHeightOffset,
          stateRef.current.mode,
          stateRef.current.character.pose === 'studio_sit',
          eng.playerPos
        );
        eng.goalPos.copy(goal.pos);
        eng.goalTarget.copy(goal.target);
        eng.goalFov = goal.fov;
        eng.cameraTransitionActive = true;
      },
      setMoveInput: (x: number, y: number, sprint = false) => {
        inputRef.current.joyX = x;
        inputRef.current.joyY = y;
        inputRef.current.joySprint = sprint;
      },
      teleportPlayer: (x: number, z: number) => {
        const eng = engineRef.current;
        if (!eng) return;
        eng.playerPos.set(x, 0, z);
        if (eng.characterRig) {
          eng.characterRig.root.position.set(x, 0, z);
        }
        const goal = getCameraGoal(
          stateRef.current.sceneConfig.cameraPreset,
          stateRef.current.sceneConfig.zoomDistance,
          stateRef.current.sceneConfig.cameraHeightOffset,
          stateRef.current.mode,
          false,
          eng.playerPos
        );
        eng.goalPos.copy(goal.pos);
        eng.goalTarget.copy(goal.target);
        eng.cameraTransitionActive = true;
      },
    }));

    // Keyboard listeners for desktop WASD / Arrow movement
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (
          document.activeElement &&
          ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
        ) {
          return;
        }
        inputRef.current.keys.add(e.code);
      };
      const onKeyUp = (e: KeyboardEvent) => {
        inputRef.current.keys.delete(e.code);
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }, []);

    // 1. Initialize WebGL Scene + PostProcessing + Loop once
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareGl();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });
      } catch {
        setContextError(true);
        return;
      }

      const initQuality = stateRef.current.quality;
      const dprCap =
        isSoftwareGl ? 1 : initQuality === 'high' ? 2 : initQuality === 'medium' ? 1.5 : 1;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.shadowMap.enabled = !isSoftwareGl && initQuality !== 'low';
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const width = container.clientWidth || 390;
      const height = container.clientHeight || 640;
      renderer.setSize(width, height);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setContextError(true);
      };
      const handleContextRestored = () => {
        setContextError(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      const scene = new THREE.Scene();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envMapTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envMapTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(40, width / Math.max(1, height), 0.1, 120);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 0.9;
      controls.maxDistance = 8.5;
      controls.minPolarAngle = Math.PI * 0.16;
      controls.maxPolarAngle = Math.PI * 0.51;

      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const lights = createStudioLightingRig(scene, isSoftwareGl);

      let composer: EffectComposer | null = null;
      let bloomPass: UnrealBloomPass | null = null;
      if (!isSoftwareGl) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.16, // subtle realistic specular sheen glow, never blown out
          0.35,
          0.92
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
      }

      const startPos = new THREE.Vector3(0, 0.12, 1.5);
      const initialGoal = getCameraGoal(
        stateRef.current.sceneConfig.cameraPreset,
        stateRef.current.sceneConfig.zoomDistance,
        stateRef.current.sceneConfig.cameraHeightOffset,
        stateRef.current.mode,
        stateRef.current.character.pose === 'studio_sit',
        startPos
      );
      camera.position.copy(initialGoal.pos);
      camera.fov = initialGoal.fov;
      camera.updateProjectionMatrix();
      controls.target.copy(initialGoal.target);
      controls.update();

      const eng = {
        renderer,
        composer,
        bloomPass,
        scene,
        camera,
        controls,
        lights,
        characterRig: null as CharacterRig | null,
        worldRig: null as DistrictWorldRig | null,
        propsRig: null as ReturnType<typeof buildPropsGroup> | null,
        maxAnisotropy,
        isSoftwareGl,
        cameraTransitionActive: false,
        goalPos: initialGoal.pos.clone(),
        goalTarget: initialGoal.target.clone(),
        goalFov: initialGoal.fov,
        playerPos: startPos,
        playerYaw: 0,
        lastHotspotId: null as string | null,
      };
      engineRef.current = eng;

      controls.addEventListener('start', () => {
        eng.cameraTransitionActive = false;
      });

      const resizeObserver = new ResizeObserver(() => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer?.setSize(w, h);
      });
      resizeObserver.observe(container);

      const clock = new THREE.Clock();
      let frameId = 0;
      let disposed = false;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl && gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
        if (!sync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        gl.flush();
        const poll = () => {
          if (disposed) {
            gl.deleteSync(sync);
            return;
          }
          const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const tick = () => {
        if (disposed) return;
        const delta = Math.min(0.08, clock.getDelta());
        const elapsed = clock.getElapsedTime();
        const {
          character: curChar,
          sceneConfig: curScene,
          mode: curMode,
          quality: curQuality,
        } = stateRef.current;

        // World Movement (Explore Mode)
        let isMoving = false;
        let speedRatio = 0;

        if (curMode === 'explore' && eng.worldRig && eng.characterRig) {
          const keys = inputRef.current.keys;
          let moveX = inputRef.current.joyX;
          let moveZ = inputRef.current.joyY;
          if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
          if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;
          if (keys.has('KeyW') || keys.has('ArrowUp')) moveZ -= 1;
          if (keys.has('KeyS') || keys.has('ArrowDown')) moveZ += 1;

          const mag = Math.hypot(moveX, moveZ);
          if (mag > 0.08) {
            isMoving = true;
            const sprint =
              inputRef.current.joySprint || keys.has('ShiftLeft') || keys.has('ShiftRight');
            speedRatio = sprint ? 1.0 : 0.5;
            const walkSpeed = sprint ? 3.9 : 2.15;

            // Camera-relative movement direction on XZ ground plane
            camera.getWorldDirection(_moveForward);
            _moveForward.y = 0;
            if (_moveForward.lengthSq() < 0.001) _moveForward.set(0, 0, -1);
            _moveForward.normalize();
            _moveRight.crossVectors(_moveForward, _upAxis).normalize();

            _moveDir
              .set(0, 0, 0)
              .addScaledVector(_moveRight, moveX / Math.max(1, mag))
              .addScaledVector(_moveForward, -moveZ / Math.max(1, mag));

            if (_moveDir.lengthSq() > 0.001) {
              _moveDir.normalize();
              const step = walkSpeed * Math.min(1, mag) * delta;
              let nextX = THREE.MathUtils.clamp(
                eng.playerPos.x + _moveDir.x * step,
                eng.worldRig.bounds.minX,
                eng.worldRig.bounds.maxX
              );
              let nextZ = THREE.MathUtils.clamp(
                eng.playerPos.z + _moveDir.z * step,
                eng.worldRig.bounds.minZ,
                eng.worldRig.bounds.maxZ
              );

              // Building collider separation
              for (const col of eng.worldRig.colliders) {
                const pad = 0.42;
                if (
                  nextX > col.minX - pad &&
                  nextX < col.maxX + pad &&
                  nextZ > col.minZ - pad &&
                  nextZ < col.maxZ + pad
                ) {
                  nextX = eng.playerPos.x;
                  nextZ = eng.playerPos.z;
                  break;
                }
              }

              const dx = nextX - eng.playerPos.x;
              const dz = nextZ - eng.playerPos.z;
              eng.playerPos.x = nextX;
              eng.playerPos.z = nextZ;

              // Sidewalk curb height in street districts
              const onStreet =
                curScene.district === 'seongsu_street' || curScene.district === 'hongdae_night';
              const targetY =
                onStreet && Math.abs(nextX) > 3.4
                  ? 0.12
                  : curScene.district === 'busan_beach'
                  ? 0.25
                  : 0.0;
              eng.playerPos.y = THREE.MathUtils.damp(eng.playerPos.y, targetY, 16, delta);

              // Smooth camera follow delta
              camera.position.x += dx;
              camera.position.z += dz;
              controls.target.set(eng.playerPos.x, eng.playerPos.y + 1.18, eng.playerPos.z);

              // Turn character smoothly into walking vector
              const desiredYaw = Math.atan2(_moveDir.x, _moveDir.z);
              let diff = desiredYaw - eng.playerYaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              eng.playerYaw += diff * Math.min(1, delta * 10);
            }
          }
        }

        // Hotspot proximity check
        if (eng.worldRig && stateRef.current.onNearbyHotspotChange) {
          let found: DistrictHotspot | null = null;
          if (curMode === 'explore') {
            for (const h of eng.worldRig.hotspots) {
              const dist = Math.hypot(eng.playerPos.x - h.x, eng.playerPos.z - h.z);
              if (dist <= h.radius) {
                found = h;
                break;
              }
            }
          }
          const nextId = found?.id ?? null;
          if (nextId !== eng.lastHotspotId) {
            eng.lastHotspotId = nextId;
            stateRef.current.onNearbyHotspotChange(found);
          }
        }

        // Smooth scripted camera presets
        if (eng.cameraTransitionActive) {
          const camLambda = isSoftwareGl ? 24 : 8.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, eng.goalPos.x, camLambda, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, eng.goalPos.y, camLambda, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, eng.goalPos.z, camLambda, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, eng.goalTarget.x, camLambda, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, eng.goalTarget.y, camLambda, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, eng.goalTarget.z, camLambda, delta);
          if (Math.abs(camera.fov - eng.goalFov) > 0.05) {
            camera.fov = THREE.MathUtils.damp(camera.fov, eng.goalFov, camLambda, delta);
            camera.updateProjectionMatrix();
          }
          if (camera.position.distanceToSquared(eng.goalPos) < 0.0005) {
            eng.cameraTransitionActive = false;
          }
        }

        // Character Rig Positioning & Living Animation
        if (eng.characterRig) {
          eng.characterRig.root.position.copy(eng.playerPos);
          const targetRotY =
            curMode === 'explore' ? eng.playerYaw : curScene.characterRotationY;
          let rDiff = targetRotY - eng.characterRig.root.rotation.y;
          while (rDiff > Math.PI) rDiff -= Math.PI * 2;
          while (rDiff < -Math.PI) rDiff += Math.PI * 2;
          eng.characterRig.root.rotation.y +=
            rDiff * Math.min(1, delta * (isSoftwareGl ? 24 : 11));

          updateCharacterAnimation(
            eng.characterRig,
            curMode === 'explore' ? 'natural_stand' : curChar.pose,
            curChar.expression,
            elapsed,
            delta,
            isSoftwareGl,
            { isMoving, speedRatio }
          );
        }

        // Companion pets animation
        if (eng.propsRig?.dogTail) {
          eng.propsRig.dogTail.rotation.y = Math.sin(elapsed * 6.5) * 0.35;
        }
        if (eng.propsRig?.dogHead) {
          eng.propsRig.dogHead.rotation.z = Math.sin(elapsed * 1.4) * 0.06;
        }
        if (eng.propsRig?.catTail) {
          eng.propsRig.catTail.rotation.z = Math.sin(elapsed * 2.1) * 0.14;
        }

        // Update Korean district ambient NPCs, rain, water & wind trees
        if (eng.worldRig) {
          updateKoreanDistrictWorld(eng.worldRig, eng.playerPos, elapsed, delta, isSoftwareGl);
        }

        controls.update();

        if (eng.composer && curQuality === 'high' && !isSoftwareGl) {
          eng.composer.render();
        } else {
          renderer.render(scene, camera);
        }

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      frameId = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        if (eng.characterRig) {
          scene.remove(eng.characterRig.root);
          eng.characterRig.dispose();
        }
        if (eng.worldRig) {
          scene.remove(eng.worldRig.group);
          eng.worldRig.dispose();
        }
        if (eng.propsRig) {
          scene.remove(eng.propsRig.propsGroup);
          eng.propsRig.dispose();
        }
        composer?.dispose();
        envMapTarget.dispose();
        renderer.dispose();
        engineRef.current = null;
      };
    }, []);

    // 2. Sync Renderer Quality settings live without rebuilding scene context
    useEffect(() => {
      const eng = engineRef.current;
      if (!eng || eng.isSoftwareGl) return;
      const dpr = quality === 'high' ? 2 : quality === 'medium' ? 1.4 : 1;
      eng.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
      eng.renderer.shadowMap.enabled = quality !== 'low';
    }, [quality]);

    // 3. Rebuild Character Mesh on appearance changes
    const characterAppearanceKey = JSON.stringify({
      id: character.id,
      frame: character.frame,
      skinTone: character.skinTone,
      blushIntensity: character.blushIntensity,
      frecklesIntensity: character.frecklesIntensity,
      faceShape: character.faceShape,
      jawWidth: character.jawWidth,
      cheekFullness: character.cheekFullness,
      eyeSize: character.eyeSize,
      eyeColor: character.eyeColor,
      eyebrowArch: character.eyebrowArch,
      eyebrowThickness: character.eyebrowThickness,
      noseBridgeWidth: character.noseBridgeWidth,
      noseTipLength: character.noseTipLength,
      lipFullness: character.lipFullness,
      lipColor: character.lipColor,
      hairStyle: character.hairStyle,
      bangsStyle: character.bangsStyle,
      hairLength: character.hairLength,
      hairColor: character.hairColor,
      hairGloss: character.hairGloss,
      heightScale: character.heightScale,
      shoulderScale: character.shoulderScale,
      waistScale: character.waistScale,
      hipScale: character.hipScale,
      outfitPreset: character.outfitPreset,
      topStyle: character.topStyle,
      bottomStyle: character.bottomStyle,
      outerwearStyle: character.outerwearStyle,
      footwearStyle: character.footwearStyle,
      primaryOutfitColor: character.primaryOutfitColor,
      secondaryOutfitColor: character.secondaryOutfitColor,
      footwearColor: character.footwearColor,
      primaryFabric: character.primaryFabric,
      secondaryFabric: character.secondaryFabric,
      glassesStyle: character.glassesStyle,
      jewelryStyle: character.jewelryStyle,
      bagStyle: character.bagStyle,
      expression: character.expression,
    });

    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;

      if (eng.characterRig) {
        eng.scene.remove(eng.characterRig.root);
        eng.characterRig.dispose();
      }
      const nextRig = buildCharacterRig(stateRef.current.character, eng.maxAnisotropy, {
        highDetail: true,
      });
      nextRig.root.position.copy(eng.playerPos);
      nextRig.root.rotation.y =
        stateRef.current.mode === 'explore'
          ? eng.playerYaw
          : stateRef.current.sceneConfig.characterRotationY;

      updateCharacterAnimation(
        nextRig,
        stateRef.current.mode === 'explore' ? 'natural_stand' : stateRef.current.character.pose,
        stateRef.current.character.expression,
        0,
        1,
        true
      );
      eng.scene.add(nextRig.root);
      eng.characterRig = nextRig;
    }, [characterAppearanceKey]);

    // 4. Rebuild Korean District World, Atmosphere & NPCs
    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;

      if (eng.worldRig) {
        eng.scene.remove(eng.worldRig.group);
        eng.worldRig.dispose();
      }

      // Position character neatly on plaza / sidewalk when switching districts
      if (sceneConfig.district === 'photo_studio') {
        eng.playerPos.set(0, 0, 0);
      } else if (sceneConfig.district === 'han_river_park') {
        eng.playerPos.set(-0.5, 0, 1.5);
      } else if (sceneConfig.district === 'busan_beach') {
        eng.playerPos.set(0.8, 0.25, 1.2);
      } else {
        eng.playerPos.set(4.6, 0.12, 1.8);
      }
      eng.playerYaw = 0;

      const activeDistrict = mode === 'creator' ? 'photo_studio' : sceneConfig.district;
      if (mode === 'creator') {
        eng.playerPos.set(0, 0, 0);
      }

      const nextWorld = buildKoreanDistrictWorld(
        eng.scene,
        activeDistrict,
        sceneConfig.timeOfDay,
        sceneConfig.weather,
        quality,
        eng.maxAnisotropy
      );
      eng.scene.add(nextWorld.group);
      eng.worldRig = nextWorld;
      applyWorldAtmosphere(
        eng.scene,
        eng.lights,
        activeDistrict,
        sceneConfig.timeOfDay,
        sceneConfig.weather
      );
      eng.lastHotspotId = null;
      stateRef.current.onNearbyHotspotChange?.(null);
    }, [sceneConfig.district, sceneConfig.timeOfDay, sceneConfig.weather, quality, mode]);

    // 5. Companion Pets & Studio Props positioned relative to player
    const propsKey = JSON.stringify(
      mode === 'studio'
        ? sceneConfig.props
        : character.pose === 'studio_sit' && mode === 'creator'
        ? ['velvet_chair']
        : []
    );

    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;

      if (eng.propsRig) {
        eng.scene.remove(eng.propsRig.propsGroup);
        eng.propsRig.dispose();
      }
      const activeProps = JSON.parse(propsKey);
      if (activeProps.length > 0) {
        const nextProps = buildPropsGroup(activeProps);
        nextProps.propsGroup.position.copy(eng.playerPos);
        eng.scene.add(nextProps.propsGroup);
        eng.propsRig = nextProps;
      } else {
        eng.propsRig = null;
      }
    }, [propsKey, sceneConfig.district, mode]);

    // 6. Camera Preset / Mode transitions
    useEffect(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const goal = getCameraGoal(
        sceneConfig.cameraPreset,
        sceneConfig.zoomDistance,
        sceneConfig.cameraHeightOffset,
        mode,
        character.pose === 'studio_sit',
        eng.playerPos
      );
      eng.goalPos.copy(goal.pos);
      eng.goalTarget.copy(goal.target);
      eng.goalFov = goal.fov;
      eng.cameraTransitionActive = true;
    }, [
      sceneConfig.cameraPreset,
      sceneConfig.zoomDistance,
      sceneConfig.cameraHeightOffset,
      sceneConfig.district,
      mode,
      character.pose,
    ]);

    const activeCssFilter =
      STUDIO_PHOTO_FILTERS.find((f) => f.id === sceneConfig.photoFilter)?.cssFilter || 'none';

    return (
      <div className="relative w-full h-full bg-[#E5E9F0] dark:bg-[#0D1017] overflow-hidden">
        {contextError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F2F2F7] dark:bg-[#1C1C1E]">
            <p className="text-[17px] font-semibold text-black dark:text-white">
              3D World Renderer Paused
            </p>
            <p className="text-[14px] text-[#8E8E93] mt-1.5 max-w-xs">
              WebGL hardware context was released by your device. Tap Reload to resume.
            </p>
            <button
              type="button"
              onClick={() => setContextError(false)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-[15px] font-semibold cursor-pointer"
            >
              Reload World
            </button>
          </div>
        ) : (
          <div
            ref={mountRef}
            className="w-full h-full"
            style={{ filter: activeCssFilter !== 'none' ? activeCssFilter : undefined }}
          />
        )}
      </div>
    );
  }
);

StudioViewport3D.displayName = 'StudioViewport3D';
