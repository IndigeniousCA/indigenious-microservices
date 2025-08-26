// 3D Model Loading Service
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { IFCLoader } from 'web-ifc-three'
import { Model3D, LoadingState, ModelMetadata } from '../types'

export class ModelLoaderService {
  private loaders: Map<string, any> = new Map()
  private loadingCallbacks: ((state: LoadingState) => void)[] = []

  constructor() {
    this.initializeLoaders()
  }

  private initializeLoaders() {
    this.loaders.set('glb', new GLTFLoader())
    this.loaders.set('gltf', new GLTFLoader())
    this.loaders.set('obj', new OBJLoader())
    this.loaders.set('stl', new STLLoader())
    this.loaders.set('ply', new PLYLoader())
    this.loaders.set('fbx', new FBXLoader())
    
    // IFC loader requires special initialization
    const ifcLoader = new IFCLoader()
    ifcLoader.ifcManager.setWasmPath('/wasm/')
    this.loaders.set('ifc', ifcLoader)
  }

  onLoadingStateChange(callback: (state: LoadingState) => void) {
    this.loadingCallbacks.push(callback)
  }

  private updateLoadingState(state: LoadingState) {
    this.loadingCallbacks.forEach(cb => cb(state))
  }

  async loadModel(model: Model3D): Promise<THREE.Object3D | THREE.Group> {
    const format = model.format.toLowerCase()
    const loader = this.loaders.get(format)

    if (!loader) {
      throw new Error(`Unsupported format: ${format}`)
    }

    this.updateLoadingState({
      isLoading: true,
      progress: 0,
      stage: 'downloading'
    })

    try {
      // Handle different loader types
      if (format === 'glb' || format === 'gltf') {
        return await this.loadGLTF(model, loader)
      } else if (format === 'ifc') {
        return await this.loadIFC(model, loader)
      } else if (format === 'obj') {
        return await this.loadOBJ(model, loader)
      } else if (format === 'stl' || format === 'ply') {
        return await this.loadGeometry(model, loader)
      } else if (format === 'fbx') {
        return await this.loadFBX(model, loader)
      } else {
        throw new Error(`Loader not implemented for: ${format}`)
      }
    } catch (error) {
      this.updateLoadingState({
        isLoading: false,
        progress: 0,
        stage: 'error',
        error: error.message
      })
      throw error
    }
  }

  private async loadGLTF(model: Model3D, loader: GLTFLoader): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        model.fileUrl,
        (gltf) => {
          this.updateLoadingState({
            isLoading: false,
            progress: 100,
            stage: 'complete'
          })
          
          // Extract metadata
          this.extractMetadata(gltf.scene, model)
          
          resolve(gltf.scene)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          this.updateLoadingState({
            isLoading: true,
            progress: percent,
            stage: percent < 50 ? 'downloading' : 'parsing'
          })
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private async loadIFC(model: Model3D, loader: IFCLoader): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        model.fileUrl,
        (ifc) => {
          this.updateLoadingState({
            isLoading: false,
            progress: 100,
            stage: 'complete'
          })
          
          // IFC models often need special handling
          this.processIFCModel(ifc)
          this.extractMetadata(ifc, model)
          
          resolve(ifc)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          this.updateLoadingState({
            isLoading: true,
            progress: percent,
            stage: percent < 50 ? 'downloading' : 'parsing'
          })
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private async loadOBJ(model: Model3D, loader: OBJLoader): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        model.fileUrl,
        (obj) => {
          this.updateLoadingState({
            isLoading: false,
            progress: 100,
            stage: 'complete'
          })
          
          // Apply default material if none exists
          this.applyDefaultMaterial(obj)
          this.extractMetadata(obj, model)
          
          resolve(obj)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          this.updateLoadingState({
            isLoading: true,
            progress: percent,
            stage: percent < 50 ? 'downloading' : 'parsing'
          })
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private async loadGeometry(model: Model3D, loader: STLLoader | PLYLoader): Promise<THREE.Mesh> {
    return new Promise((resolve, reject) => {
      loader.load(
        model.fileUrl,
        (geometry) => {
          this.updateLoadingState({
            isLoading: false,
            progress: 100,
            stage: 'complete'
          })
          
          // Create mesh with default material
          const material = new THREE.MeshPhongMaterial({
            color: 0x808080,
            specular: 0x111111,
            shininess: 200
          })
          
          const mesh = new THREE.Mesh(geometry as THREE.BufferGeometry, material)
          
          // Center geometry
          geometry.computeBoundingBox()
          geometry.center()
          
          this.extractMetadata(mesh, model)
          
          resolve(mesh)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          this.updateLoadingState({
            isLoading: true,
            progress: percent,
            stage: percent < 50 ? 'downloading' : 'parsing'
          })
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private async loadFBX(model: Model3D, loader: FBXLoader): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        model.fileUrl,
        (fbx) => {
          this.updateLoadingState({
            isLoading: false,
            progress: 100,
            stage: 'complete'
          })
          
          // FBX often contains animations
          if (fbx.animations && fbx.animations.length > 0) {
            model.metadata.hasAnimations = true
          }
          
          this.extractMetadata(fbx, model)
          
          resolve(fbx)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          this.updateLoadingState({
            isLoading: true,
            progress: percent,
            stage: percent < 50 ? 'downloading' : 'parsing'
          })
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private extractMetadata(object: THREE.Object3D, model: Model3D): ModelMetadata {
    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    
    let vertexCount = 0
    let faceCount = 0
    let materialCount = new Set<string>()
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry
        if (geometry instanceof THREE.BufferGeometry) {
          const position = geometry.attributes.position
          if (position) {
            vertexCount += position.count
          }
          
          const index = geometry.index
          if (index) {
            faceCount += index.count / 3
          } else if (position) {
            faceCount += position.count / 3
          }
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => materialCount.add(mat.uuid))
          } else {
            materialCount.add(child.material.uuid)
          }
        }
      }
    })
    
    const metadata: ModelMetadata = {
      dimensions: {
        x: size.x,
        y: size.y,
        z: size.z,
        unit: 'm' // Default to meters
      },
      vertexCount,
      faceCount: Math.floor(faceCount),
      materialCount: materialCount.size,
      hasTextures: this.checkForTextures(object),
      hasAnimations: model.metadata?.hasAnimations || false,
      bounds: {
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z }
      },
      origin: { x: center.x, y: center.y, z: center.z }
    }
    
    // Update model metadata
    model.metadata = { ...model.metadata, ...metadata }
    
    return metadata
  }

  private checkForTextures(object: THREE.Object3D): boolean {
    let hasTextures = false
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(mat => {
          if (mat instanceof THREE.MeshStandardMaterial || 
              mat instanceof THREE.MeshPhongMaterial ||
              mat instanceof THREE.MeshBasicMaterial) {
            if (mat.map || mat.normalMap || mat.roughnessMap || mat.metalnessMap) {
              hasTextures = true
            }
          }
        })
      }
    })
    
    return hasTextures
  }

  private applyDefaultMaterial(object: THREE.Object3D) {
    const defaultMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      specular: 0x111111,
      shininess: 200,
      side: THREE.DoubleSide
    })
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.material) {
        child.material = defaultMaterial
      }
    })
  }

  private processIFCModel(ifc: THREE.Group) {
    // IFC models often need special processing
    ifc.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadows
        child.castShadow = true
        child.receiveShadow = true
        
        // Fix material sides for better visibility
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(mat => {
            if (mat instanceof THREE.Material) {
              mat.side = THREE.DoubleSide
            }
          })
        }
      }
    })
  }

  async convertToFormat(object: THREE.Object3D, format: 'glb' | 'obj'): Promise<Blob> {
    // TODO: Implement format conversion
    // This would use THREE.js exporters to convert between formats
    throw new Error('Format conversion not yet implemented')
  }

  dispose() {
    // Clean up loaders
    this.loaders.clear()
    this.loadingCallbacks = []
  }
}