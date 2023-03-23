import path from 'path';
import fs from 'fs-extra';
import type { RspackPluginInstance, Compiler } from '@rspack/core';

export class RspackVirtualModulePlugin implements RspackPluginInstance {
  #staticModules: Record<string, string>;

  #tempDir: string;

  constructor(staticModules: Record<string, string>) {
    this.#staticModules = staticModules;
    const nodeModulesDir = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesDir)) {
      fs.mkdirSync(nodeModulesDir);
    }
    this.#tempDir = fs.mkdtempSync(
      path.join(nodeModulesDir, 'rspack-virtual-module-'),
    );
  }

  apply(compiler: Compiler) {
    // Write the modules to the disk
    Object.entries(this.#staticModules).forEach(([path, content]) => {
      fs.writeFileSync(this.#normalizePath(path), content);
    });
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
    this.#staticModules[normalizedPath] = content;
    fs.writeFileSync(normalizedPath, content);
  }

  clear() {
    fs.removeSync(this.#tempDir);
  }

  #normalizePath(p: string) {
    return path.join(this.#tempDir, p.endsWith('.js') ? p : `${p}.js`);
  }
}

export default RspackVirtualModulePlugin;
