import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

export interface ManifestEntry {
  name: string;
  url: string;
}

/**
 * Loads GLB assets. Every asset is optional: a failed download logs a warning
 * and the game substitutes a procedural fallback, so the build never breaks
 * on a missing file.
 */
export class AssetManager {
  private gltfs = new Map<string, GLTF>();
  private loader = new GLTFLoader();

  async loadAll(
    manifest: ManifestEntry[],
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    let loaded = 0;
    await Promise.all(
      manifest.map(async (entry) => {
        try {
          const gltf = await this.loader.loadAsync(entry.url);
          this.gltfs.set(entry.name, gltf);
        } catch (err) {
          console.warn(`Asset "${entry.name}" failed to load (${entry.url}); using fallback.`, err);
        } finally {
          loaded++;
          onProgress?.(loaded, manifest.length);
        }
      }),
    );
  }

  gltf(name: string): GLTF | undefined {
    return this.gltfs.get(name);
  }
}
