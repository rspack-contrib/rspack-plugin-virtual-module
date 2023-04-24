import { readFileSync } from 'fs';
import dotenv from 'dotenv-defaults';
import type { Compiler, RspackPluginInstance, Target } from '@rspack/core';
import { interpolate, isMainThreadElectron } from './utils';

export interface DotenvPluginOptions {
  /**
   * The path to your environment variables.
   * @default './.env'.
   */
  path?: string | undefined;

  /**
   * If `false` ignore safe-mode, if `true` load `'./.env.example'`, if a `string` load that file as the sample.
   * @default false
   */
  safe?: boolean | string | undefined;

  /**
   * Whether to allow empty strings in safe mode.
   * If false, will throw an error if any env variables are empty (but only if safe mode is enabled).
   * @default false
   */
  allowEmptyValues?: boolean | undefined;

  /**
   * Set to `true` if you would rather load all system variables as well (useful for CI purposes).
   * @default false
   */
  systemvars?: boolean | undefined;

  /**
   * If `true`, all warnings will be surpressed.
   * @default false
   */
  silent?: boolean | undefined;

  /**
   * Allows your variables to be "expanded" for reusability within your .env file.
   * @default false
   */
  expand?: boolean | undefined;

  /**
   * Adds support for dotenv-defaults. If set to `true`, uses `./.env.defaults`. If a `string`, uses that location for a defaults file.
   * Read more at {@link https://www.npmjs.com/package/dotenv-defaults}.
   * @default false
   */
  defaults?: boolean | string | undefined;

  /**
   * Override the automatic check whether to stub `process.env`.
   * @dfault false
   */
  ignoreStub?: boolean | undefined;
  /**
   * The prefix to use before the name of your env variables.
   * @default 'process.env.'
   */
  prefix?: string | undefined;
}

interface DotenvPluginConfig
  extends Omit<DotenvPluginOptions, 'path' | 'prefix'> {
  path: string;
  prefix: string;
}

export class DotenvPlugin implements RspackPluginInstance {
  private config: DotenvPluginConfig;

  constructor(options: DotenvPluginOptions = {}) {
    this.config = { path: './.env', prefix: 'process.env.', ...options };
  }

  apply(compiler: Compiler) {
    const variables = this.gatherVariables();
    const target = compiler.options.target ?? 'web';
    const data = this.formatData(variables, target);
    const define = compiler.options.builtins.define || {};
    compiler.options.builtins.define = { ...define, ...data };
  }

  gatherVariables() {
    const { safe, allowEmptyValues } = this.config;
    const vars = this.initializeVars();
    const { env, blueprint } = this.getEnvs();

    Object.keys(blueprint).forEach(key => {
      const value = Object.prototype.hasOwnProperty.call(vars, key)
        ? vars[key]
        : env[key];

      const isMissing =
        typeof value === 'undefined' ||
        value === null ||
        (!allowEmptyValues && value === '');

      if (safe && isMissing) {
        throw new Error(`Missing environment variable: ${key}`);
      } else {
        vars[key] = value;
      }
    });

    // add the leftovers
    if (safe) {
      Object.keys(env).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) {
          vars[key] = env[key];
        }
      });
    }

    return vars;
  }

  initializeVars() {
    return this.config.systemvars ? { ...process.env } : {};
  }

  getEnvs() {
    const { path, silent, safe } = this.config;
    const env = dotenv.parse(this.loadFile(path, silent), this.getDefaults());

    let blueprint = env;
    if (safe) {
      let file = `${path}.example`;
      if (safe !== true) {
        file = safe;
      }
      blueprint = dotenv.parse(this.loadFile(file, silent));
    }

    return {
      env,
      blueprint,
    };
  }

  getDefaults() {
    const { path, defaults, silent } = this.config;

    if (defaults) {
      return this.loadFile(
        defaults === true ? `${path}.defaults` : defaults,
        silent,
      );
    }

    return '';
  }

  formatData(variables: NodeJS.ProcessEnv, target: Target) {
    const { expand, prefix } = this.config;

    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      formatted[`${prefix}${key}`] = JSON.stringify(
        expand && typeof value === 'string'
          ? interpolate(value, variables)
          : value,
      );
    }

    // We have to stub any remaining `process.env`s due to Webpack 5 not polyfilling it anymore
    // https://github.com/mrsteele/dotenv-webpack/issues/240#issuecomment-710231534
    // However, if someone targets Node or Electron `process.env` still exists, and should therefore be kept
    // https://webpack.js.org/configuration/target
    if (this.shouldStub(target)) {
      // Results in `"MISSING_ENV_VAR".NAME` which is valid JS
      formatted['process.env'] = '"MISSING_ENV_VAR"';
    }

    return formatted;
  }

  shouldStub(targetInput: Target) {
    const targets = Array.isArray(targetInput) ? targetInput : [targetInput];
    return targets.every(
      target =>
        // If configured prefix is 'process.env'
        this.config.prefix === 'process.env.' &&
        // If we're not configured to never stub
        this.config.ignoreStub !== true &&
        // And
        // We are configured to always stub
        (this.config.ignoreStub === false ||
          // Or if we should according to the target
          (typeof target === 'string' &&
            !target.includes('node') &&
            !isMainThreadElectron(target))),
    );
  }

  loadFile(file: string, silent?: boolean): string {
    try {
      return readFileSync(file, 'utf8');
    } catch (err) {
      this.warn(`Failed to load ${file}.`, silent);
      return '';
    }
  }

  warn(msg: string, silent?: boolean) {
    !silent && console.warn(msg);
  }
}
