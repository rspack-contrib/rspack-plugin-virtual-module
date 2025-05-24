import crypto from 'node:crypto';
import path, { dirname, join, extname } from 'node:path';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import fs from 'fs-extra';

export class RspackVirtualModulePlugin implements RspackPluginInstance {
  #staticModules: Record<string, string>;

  #tempDir: string;

  constructor(staticModules: Record<string, string>, tempDir?: string) {
    this.#staticModules = staticModules;
    const nodeModulesDir = join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesDir)) {
      fs.mkdirSync(nodeModulesDir);
    }

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
    if (!fs.existsSync(this.#tempDir)) {
      fs.mkdirSync(this.#tempDir);
    }
  }

  apply(compiler: Compiler) {
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
    compiler.hooks.shutdown.tap('RspackVirtualModulePlugin', () => {
      this.clear();
    });
  }

  writeModule(path: string, content: string) {
    const normalizedPath = this.#normalizePath(path);
    fs.ensureDirSync(dirname(normalizedPath));
    fs.writeFileSync(normalizedPath, content);
  }

  clear() {
    fs.removeSync(this.#tempDir);
  }

  #normalizePath(p: string) {
    const ext = extname(p);
    return join(this.#tempDir, ext ? p : `${p}.js`);
  }
}

export default RspackVirtualModulePlugin;
