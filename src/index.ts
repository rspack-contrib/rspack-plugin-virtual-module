import crypto from 'node:crypto';
import path, { dirname, extname, join } from 'node:path';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import fs from 'fs-extra';

export class RspackVirtualModulePlugin implements RspackPluginInstance {
  #staticModules: Record<string, string>;
  #tempDir: string;
  #cleanupHandler: (() => void) | null = null;
  #isWatching = false;

  constructor(staticModules: Record<string, string>, tempDir?: string) {
    this.#staticModules = staticModules;

    try {
      const nodeModulesDir = join(process.cwd(), 'node_modules');
      fs.ensureDirSync(nodeModulesDir);

      if (!tempDir) {
        const hash = crypto
          .createHash('md5')
          .update(JSON.stringify(this.#staticModules))
          .digest('hex')
          .slice(0, 8);
        this.#tempDir = path.join(
          nodeModulesDir,
          `rspack-virtual-module-${hash}`,
        );
      } else {
        this.#tempDir = path.join(nodeModulesDir, tempDir);
      }

      fs.ensureDirSync(this.#tempDir);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize virtual module plugin: ${errorMessage}`,
      );
    }
  }

  apply(compiler: Compiler) {
    try {
      // Write the modules to the disk
      for (const [path, content] of Object.entries(this.#staticModules)) {
        this.writeModule(path, content);
      }

      const originalResolveModulesDir = compiler.options.resolve.modules || [
        'node_modules',
      ];
      compiler.options.resolve.modules = [
        ...originalResolveModulesDir,
        this.#tempDir,
      ];
      compiler.options.resolve.alias = {
        ...compiler.options.resolve.alias,
        ...Object.keys(this.#staticModules).reduce(
          (acc, p) => {
            acc[p] = this.#normalizePath(p);
            return acc;
          },
          {} as Record<string, string>,
        ),
      };

      const boundClear = this.clear.bind(this);
      this.#cleanupHandler = boundClear;

      compiler.hooks.shutdown.tap('RspackVirtualModulePlugin', boundClear);

      compiler.hooks.watchRun.tap('RspackVirtualModulePlugin', () => {
        this.#isWatching = true;
      });

      compiler.hooks.watchClose.tap('RspackVirtualModulePlugin', () => {
        if (this.#isWatching) {
          boundClear();
          this.#isWatching = false;
        }
      });

      compiler.hooks.done.tap('RspackVirtualModulePlugin', (stats) => {
        if (stats.hasErrors() && !this.#isWatching) {
          boundClear();
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`RspackVirtualModulePlugin error: ${errorMessage}`);
    }
  }

  writeModule(path: string, content: string) {
    try {
      const normalizedPath = this.#normalizePath(path);
      fs.ensureDirSync(dirname(normalizedPath));
      if (fs.existsSync(normalizedPath)) {
        const existingContent = fs.readFileSync(normalizedPath, 'utf8');
        if (existingContent === content) {
          return;
        }
      }

      fs.writeFileSync(normalizedPath, content);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to write virtual module ${path}: ${errorMessage}`,
      );
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.#tempDir)) {
        fs.removeSync(this.#tempDir);
      }
    } catch (error) {
      console.warn(`Failed to clean up virtual modules: ${error}`);
    }
  }

  #normalizePath(p: string) {
    const ext = extname(p);
    return join(this.#tempDir, ext ? p : `${p}.js`);
  }
}

export default RspackVirtualModulePlugin;
