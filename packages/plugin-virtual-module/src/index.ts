import path, { dirname, join, extname } from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import type { RspackPluginInstance, Compiler } from '@rspack/core';

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
    Object.entries(this.#staticModules).forEach(([path, content]) => {
      fs.writeFileSync(this.#normalizePath(path), content);
    });
    const originalResolveModulesDir = compiler.options.resolve.modules || [
      'node_modules',
    ];
    compiler.options.resolve.modules = [
      ...originalResolveModulesDir,
      this.#tempDir,
    ];
    compiler.options.resolve.alias = {
      ...compiler.options.resolve.alias,
      ...Object.keys(this.#staticModules).reduce((acc, p) => {
        acc[p] = this.#normalizePath(p);
        return acc;
      }, {} as Record<string, string>),
    };
    process.on('exit', this.clear.bind(this));
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
