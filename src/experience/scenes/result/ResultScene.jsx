import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, MathUtils } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import resultBackdropFragmentShader from './resultBackdropFragment.glsl?raw'
import resultBackdropVertexShader from './resultBackdropVertex.glsl?raw'
import ResultBackgroundParticles from './ResultBackgroundParticles.jsx'
import { RESULT_SCENE_CONFIG as CONFIG } from './resultConfig.js'
import {
  createDustPositions,
  createInspectionOrbitData,
  createNetworkData,
  createNetworkUniforms,
  prepareGeometry,
  prepareMaterial,
  smootherRange,
} from './resultGeometry.js'
import { getNearestRestRotation } from './resultInspection.js'
import resultNetworkFragmentShader from './resultNetworkFragment.glsl?raw'
import resultNetworkVertexShader from './resultNetworkVertex.glsl?raw'
import { StaticPointCloud } from './StaticPointCloud.jsx'

export function ResultScene({
  pointerRef,
  reducedMotion,
  resultInspectionOpen,
  resultInteractionRef,
  sceneStateRef,
}) {
  const { camera, size, viewport } = useThree()
  const { scene } = useLoader(GLTFLoader, CONFIG.modelUrl)
  const activeTime = useRef(0)
  const backdropMaterialRef = useRef()
  const cameraOffset = useRef({ x: 0, y: 0 })
  const dustRef = useRef()
  const grainGroupRef = useRef()
  const grainRef = useRef()
  const grainInspectionRotation = useRef(0)
  const inspectionMixRef = useRef(0)
  const inspectionOrbitRef = useRef()
  const orbitMarkerCoreMaterialRef = useRef()
  const orbitMarkerGlowMaterialRef = useRef()
  const orbitRingMaterialRef = useRef()
  const networkGroupRef = useRef()
  const networkLightRef = useRef()
  const networkOffset = useRef({ x: 0, y: 0, z: 0 })
  const connectorCoreMaterialRef = useRef()
  const connectorGlowMaterialRef = useRef()
  const nodeCoreMaterialRef = useRef()
  const nodeGlowMaterialRef = useRef()
  const dustPositions = useMemo(createDustPositions, [])
  const inspectionOrbitData = useMemo(createInspectionOrbitData, [])
  const networkData = useMemo(createNetworkData, [])
  const networkUniforms = useMemo(() => ({
    connectorCore: createNetworkUniforms(
      CONFIG.network.connectorColor,
      CONFIG.network.connectorOpacity,
      CONFIG.network.connectorSize,
      0,
    ),
    connectorGlow: createNetworkUniforms(
      CONFIG.network.connectorColor,
      CONFIG.network.glowOpacity,
      CONFIG.network.connectorGlowSize,
      1,
    ),
    nodeCore: createNetworkUniforms(
      CONFIG.network.pointColor,
      CONFIG.network.nodeOpacity,
      CONFIG.network.nodeSize,
      0,
    ),
    nodeGlow: createNetworkUniforms(
      CONFIG.network.pointColor,
      CONFIG.network.glowOpacity,
      CONFIG.network.nodeGlowSize,
      1,
    ),
  }), [])
  const orbitUniforms = useMemo(() => ({
    markerCore: createNetworkUniforms(
      CONFIG.inspection.orbit.color,
      0,
      CONFIG.inspection.orbit.markerSize,
      0,
    ),
    markerGlow: createNetworkUniforms(
      CONFIG.inspection.orbit.color,
      0,
      CONFIG.inspection.orbit.markerGlowSize,
      1,
    ),
    ring: createNetworkUniforms(
      CONFIG.inspection.orbit.color,
      0,
      CONFIG.inspection.orbit.dotSize,
      0,
    ),
  }), [])
  const backdropUniforms = useMemo(() => ({
    uOrangeStrength: { value: 1 },
    uTime: { value: 0 },
  }), [])
  const assets = useMemo(() => {
    const geometry = prepareGeometry(
      scene.getObjectByName(CONFIG.meshName),
      CONFIG.meshName,
    )
    const materialNode = scene.getObjectByName(CONFIG.materialSourceMeshName)
      ?? scene.getObjectByName(CONFIG.meshName)
    return {
      geometry,
      material: prepareMaterial(materialNode),
    }
  }, [scene])

  useEffect(() => {
    camera.fov = CONFIG.camera.fov
    camera.position.fromArray(CONFIG.camera.position)
    camera.lookAt(...CONFIG.camera.lookAt)
    camera.updateProjectionMatrix()
  }, [camera])

  useEffect(() => () => {
    assets.geometry.dispose()
    assets.material.dispose()
  }, [assets])

  useFrame((_, delta) => {
    if (!sceneStateRef?.current?.isActive) return

    const progress = MathUtils.clamp(sceneStateRef.current.progress ?? 0, 0, 1)
    const transitionVisibility = MathUtils.clamp(
      sceneStateRef.current.visibility ?? 0,
      0,
      1,
    )
    const entrance = Math.max(
      smootherRange(progress, CONFIG.grain.entranceRange),
      transitionVisibility,
    )
    const exit = smootherRange(progress, CONFIG.grain.exitRange)
    const visibility = entrance
    const orangeFade = smootherRange(
      progress,
      CONFIG.atmosphere.orangeFadeRange,
    )
    const inspectionTarget = resultInspectionOpen ? 1 : 0
    inspectionMixRef.current = reducedMotion
      ? inspectionTarget
      : MathUtils.damp(
        inspectionMixRef.current,
        inspectionTarget,
        CONFIG.inspection.transitionDamping,
        delta,
      )
    const inspectionMix = inspectionMixRef.current
    const particleZoomMix = reducedMotion ? 0 : inspectionMix
    const orbitVisibility = smootherRange(inspectionMix, [0.58, 0.96])
    const mobile = size.width < 760
    const position = mobile
      ? CONFIG.grain.mobilePosition
      : CONFIG.grain.desktopPosition
    const scale = mobile
      ? CONFIG.grain.mobileScale
      : CONFIG.grain.desktopScale

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      delta,
      !reducedMotion,
    )
    const time = reducedMotion ? 0 : activeTime.current
    backdropMaterialRef.current.uniforms.uTime.value = time
    backdropMaterialRef.current.uniforms.uOrangeStrength.value = 1 - orangeFade

    grainGroupRef.current.position.set(
      position[0] + MathUtils.lerp(0.45, 0, entrance),
      position[1] + MathUtils.lerp(-0.25, 0, entrance) + exit * 5.5,
      position[2],
    )
    grainGroupRef.current.scale.setScalar(scale * MathUtils.lerp(0.72, 1, entrance))
    const interaction = resultInteractionRef?.current
    const targetInspectionRotation = resultInspectionOpen
      ? interaction?.rotationTarget ?? 0
      : getNearestRestRotation(grainInspectionRotation.current)
    grainInspectionRotation.current = reducedMotion
      ? targetInspectionRotation
      : MathUtils.damp(
        grainInspectionRotation.current,
        targetInspectionRotation,
        CONFIG.inspection.rotationDamping,
        delta,
      )
    grainRef.current.rotation.set(
      CONFIG.grain.baseRotation[0]
        + (reducedMotion || resultInspectionOpen
          ? 0
          : Math.sin(time * 0.34) * 0.018),
      CONFIG.grain.baseRotation[1]
        + grainInspectionRotation.current
        + (reducedMotion || resultInspectionOpen
          ? 0
          : Math.sin(time * 0.22) * 0.06),
      CONFIG.grain.baseRotation[2],
    )
    assets.material.opacity = visibility

    const pointer = pointerRef?.current
    const targetNetworkX = reducedMotion
      ? 0
      : (pointer?.ndcX ?? 0) * CONFIG.network.pointerRange[0]
    const targetNetworkY = reducedMotion
      ? 0
      : (pointer?.ndcY ?? 0) * CONFIG.network.pointerRange[1]
    const targetNetworkZ = reducedMotion
      ? 0
      : (pointer?.ndcX ?? 0) * CONFIG.network.pointerRange[2]
    networkOffset.current.x = MathUtils.damp(
      networkOffset.current.x,
      targetNetworkX,
      CONFIG.network.motionDamping,
      delta,
    )
    networkOffset.current.y = MathUtils.damp(
      networkOffset.current.y,
      targetNetworkY,
      CONFIG.network.motionDamping,
      delta,
    )
    networkOffset.current.z = MathUtils.damp(
      networkOffset.current.z,
      targetNetworkZ,
      CONFIG.network.motionDamping,
      delta,
    )
    networkGroupRef.current.position.copy(grainGroupRef.current.position)
    networkGroupRef.current.position.x += networkOffset.current.x
    networkGroupRef.current.position.y += networkOffset.current.y
    networkGroupRef.current.position.z += networkOffset.current.z
      + CONFIG.inspection.particleCameraTravel * particleZoomMix
    networkGroupRef.current.scale.setScalar(
      (mobile ? 0.58 : 1)
      * MathUtils.lerp(1, CONFIG.inspection.particleZoom, particleZoomMix),
    )
    networkGroupRef.current.rotation.set(0, 0, 0)
    const networkInspectionVisibility = 1 - smootherRange(
      inspectionMix,
      CONFIG.inspection.particleFadeRange,
    )
    networkLightRef.current.intensity = CONFIG.network.light.intensity
      * visibility
      * networkInspectionVisibility
      * (reducedMotion ? 1 : 0.92 + Math.sin(time * 0.31) * 0.08)
    const networkMaterials = [
      connectorCoreMaterialRef.current,
      connectorGlowMaterialRef.current,
      nodeCoreMaterialRef.current,
      nodeGlowMaterialRef.current,
    ]
    networkMaterials.forEach((material) => {
      material.uniforms.uTime.value = time
      material.uniforms.uPixelRatio.value = viewport.dpr
      material.uniforms.uPulseStrength.value = reducedMotion
        ? 0
        : CONFIG.network.pulseStrength
      material.uniforms.uDriftStrength.value = reducedMotion ? 0 : 1
    })
    connectorCoreMaterialRef.current.uniforms.uOpacity.value = visibility
      * networkInspectionVisibility
      * CONFIG.network.connectorOpacity
    connectorGlowMaterialRef.current.uniforms.uOpacity.value = visibility
      * networkInspectionVisibility
      * CONFIG.network.glowOpacity
    nodeCoreMaterialRef.current.uniforms.uOpacity.value = visibility
      * networkInspectionVisibility
      * CONFIG.network.nodeOpacity
    nodeGlowMaterialRef.current.uniforms.uOpacity.value = visibility
      * networkInspectionVisibility
      * CONFIG.network.glowOpacity

    inspectionOrbitRef.current.position.copy(grainGroupRef.current.position)
    inspectionOrbitRef.current.position.x += CONFIG.inspection.orbit.position[0]
    inspectionOrbitRef.current.position.y += CONFIG.inspection.orbit.position[1]
    inspectionOrbitRef.current.position.z += CONFIG.inspection.orbit.position[2]
    const cameraFacingAngle = Math.atan2(
      camera.position.z - inspectionOrbitRef.current.position.z,
      camera.position.x - inspectionOrbitRef.current.position.x,
    )
    const cameraFacingOffset = Math.PI / 2 - cameraFacingAngle
    inspectionOrbitRef.current.rotation.set(
      CONFIG.inspection.orbit.rotation[0],
      CONFIG.inspection.orbit.rotation[1]
        + grainInspectionRotation.current
        + cameraFacingOffset,
      CONFIG.inspection.orbit.rotation[2],
    )
    inspectionOrbitRef.current.scale.setScalar(
      mobile ? CONFIG.inspection.orbit.mobileScale : 1,
    )
    const orbitMaterials = [
      orbitRingMaterialRef.current,
      orbitMarkerCoreMaterialRef.current,
      orbitMarkerGlowMaterialRef.current,
    ]
    orbitMaterials.forEach((material) => {
      material.uniforms.uTime.value = time
      material.uniforms.uPixelRatio.value = viewport.dpr
      material.uniforms.uDriftStrength.value = 0
    })
    orbitRingMaterialRef.current.uniforms.uOpacity.value = orbitVisibility
      * CONFIG.inspection.orbit.dotOpacity
    orbitMarkerCoreMaterialRef.current.uniforms.uOpacity.value = orbitVisibility
      * CONFIG.inspection.orbit.markerOpacity
    orbitMarkerGlowMaterialRef.current.uniforms.uOpacity.value = orbitVisibility
      * CONFIG.inspection.orbit.markerGlowOpacity
    dustRef.current.rotation.z = reducedMotion ? 0 : time * 0.0025

    const pointerVisibility = (1 - orangeFade) * (1 - inspectionMix)
    const targetCameraX = reducedMotion
      ? 0
      : (pointer?.ndcX ?? 0) * CONFIG.camera.pointerRange[0] * pointerVisibility
    const targetCameraY = reducedMotion
      ? 0
      : (pointer?.ndcY ?? 0) * CONFIG.camera.pointerRange[1] * pointerVisibility
    cameraOffset.current.x = MathUtils.damp(
      cameraOffset.current.x,
      targetCameraX,
      CONFIG.camera.pointerDamping,
      delta,
    )
    cameraOffset.current.y = MathUtils.damp(
      cameraOffset.current.y,
      targetCameraY,
      CONFIG.camera.pointerDamping,
      delta,
    )
    camera.position.set(
      CONFIG.camera.position[0] + cameraOffset.current.x,
      CONFIG.camera.position[1] + cameraOffset.current.y,
      CONFIG.camera.position[2],
    )
    camera.lookAt(
      CONFIG.camera.lookAt[0] + cameraOffset.current.x * 0.3,
      CONFIG.camera.lookAt[1] + cameraOffset.current.y * 0.3,
      CONFIG.camera.lookAt[2],
    )
  })

  return (
    <>
      <color attach="background" args={[CONFIG.background]} />

      <mesh position={[0, 0, -4.5]} scale={[30, 18, 1]} renderOrder={-10}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={backdropMaterialRef}
          depthTest={false}
          depthWrite={false}
          fragmentShader={resultBackdropFragmentShader}
          toneMapped={false}
          uniforms={backdropUniforms}
          vertexShader={resultBackdropVertexShader}
        />
      </mesh>

      <points ref={dustRef} frustumCulled={false} renderOrder={-2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          blending={AdditiveBlending}
          color={CONFIG.atmosphere.dustColor}
          depthWrite={false}
          opacity={CONFIG.atmosphere.dustOpacity}
          size={CONFIG.atmosphere.dustSize}
          sizeAttenuation
          toneMapped={false}
          transparent
        />
      </points>

      <ResultBackgroundParticles
        reducedMotion={reducedMotion}
        sceneStateRef={sceneStateRef}
      />

      <hemisphereLight args={['#d6d99b', '#00382e', 0.38]} />
      <directionalLight color="#ffe08a" intensity={3.25} position={[4.6, 3.8, 5]} />
      <directionalLight color="#89d4bd" intensity={2.15} position={[-4, -1, 2]} />
      <pointLight color="#e27a43" intensity={0.7} position={[1.8, 3, 2.5]} />

      <group ref={grainGroupRef}>
        <mesh
          ref={grainRef}
          geometry={assets.geometry}
          material={assets.material}
          frustumCulled={false}
        />
      </group>

      <group ref={inspectionOrbitRef}>
        <StaticPointCloud
          data={inspectionOrbitData.ring}
          materialRef={orbitRingMaterialRef}
          uniforms={orbitUniforms.ring}
        />
        <StaticPointCloud
          data={inspectionOrbitData.markers}
          materialRef={orbitMarkerGlowMaterialRef}
          uniforms={orbitUniforms.markerGlow}
        />
        <StaticPointCloud
          data={inspectionOrbitData.markers}
          materialRef={orbitMarkerCoreMaterialRef}
          uniforms={orbitUniforms.markerCore}
        />
      </group>

      <group ref={networkGroupRef}>
        <pointLight
          ref={networkLightRef}
          color={CONFIG.network.light.color}
          decay={CONFIG.network.light.decay}
          distance={CONFIG.network.light.distance}
          intensity={CONFIG.network.light.intensity}
          position={CONFIG.network.light.position}
        />
        <points frustumCulled={false} renderOrder={1}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[networkData.connectorPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-aPulsePhase"
              args={[networkData.connectorPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDepthFactor"
              args={[networkData.connectorDepthFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aSizeFactor"
              args={[networkData.connectorSizeFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftPhase"
              args={[networkData.connectorDriftPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftSpeed"
              args={[networkData.connectorDriftSpeeds, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftAmplitude"
              args={[networkData.connectorDriftAmplitudes, 3]}
            />
            <bufferAttribute
              attach="attributes-aShade"
              args={[networkData.connectorShadeFactors, 1]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={connectorGlowMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={resultNetworkFragmentShader}
            toneMapped={false}
            transparent
            uniforms={networkUniforms.connectorGlow}
            vertexShader={resultNetworkVertexShader}
          />
        </points>
        <points frustumCulled={false} renderOrder={2}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[networkData.connectorPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-aPulsePhase"
              args={[networkData.connectorPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDepthFactor"
              args={[networkData.connectorDepthFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aSizeFactor"
              args={[networkData.connectorSizeFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftPhase"
              args={[networkData.connectorDriftPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftSpeed"
              args={[networkData.connectorDriftSpeeds, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftAmplitude"
              args={[networkData.connectorDriftAmplitudes, 3]}
            />
            <bufferAttribute
              attach="attributes-aShade"
              args={[networkData.connectorShadeFactors, 1]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={connectorCoreMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={resultNetworkFragmentShader}
            toneMapped={false}
            transparent
            uniforms={networkUniforms.connectorCore}
            vertexShader={resultNetworkVertexShader}
          />
        </points>
        <points frustumCulled={false} renderOrder={3}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[networkData.pointPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-aPulsePhase"
              args={[networkData.nodePhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDepthFactor"
              args={[networkData.nodeDepthFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aSizeFactor"
              args={[networkData.nodeSizeFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftPhase"
              args={[networkData.nodeDriftPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftSpeed"
              args={[networkData.nodeDriftSpeeds, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftAmplitude"
              args={[networkData.nodeDriftAmplitudes, 3]}
            />
            <bufferAttribute
              attach="attributes-aShade"
              args={[networkData.nodeShadeFactors, 1]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={nodeGlowMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={resultNetworkFragmentShader}
            toneMapped={false}
            transparent
            uniforms={networkUniforms.nodeGlow}
            vertexShader={resultNetworkVertexShader}
          />
        </points>
        <points frustumCulled={false} renderOrder={4}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[networkData.pointPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-aPulsePhase"
              args={[networkData.nodePhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDepthFactor"
              args={[networkData.nodeDepthFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aSizeFactor"
              args={[networkData.nodeSizeFactors, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftPhase"
              args={[networkData.nodeDriftPhases, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftSpeed"
              args={[networkData.nodeDriftSpeeds, 1]}
            />
            <bufferAttribute
              attach="attributes-aDriftAmplitude"
              args={[networkData.nodeDriftAmplitudes, 3]}
            />
            <bufferAttribute
              attach="attributes-aShade"
              args={[networkData.nodeShadeFactors, 1]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={nodeCoreMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={resultNetworkFragmentShader}
            toneMapped={false}
            transparent
            uniforms={networkUniforms.nodeCore}
            vertexShader={resultNetworkVertexShader}
          />
        </points>
      </group>
    </>
  )
}

useLoader.preload(GLTFLoader, CONFIG.modelUrl)
