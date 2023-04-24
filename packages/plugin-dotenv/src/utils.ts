import type { Target } from '@rspack/core';

// like String.prototype.search but returns the last index
function searchLast(str: string, rgx: RegExp) {
  const matches = Array.from(str.matchAll(rgx));
  return matches.length > 0 ? matches.slice(-1)[0].index : -1;
}

// mostly copied from https://github.com/motdotla/dotenv-expand/blob/master/lib/main.js#L4
export function interpolate(
  envValue: string,
  environment: NodeJS.ProcessEnv,
): string {
  // find the last unescaped dollar sign in the
  // value so that we can evaluate it
  const lastUnescapedDollarSignIndex = searchLast(envValue, /(?!(?<=\\))\$/g);

  // If we couldn't match any unescaped dollar sign
  // let's return the string as is
  if (lastUnescapedDollarSignIndex === -1) {
    return envValue;
  }

  // This is the right-most group of variables in the string
  const rightMostGroup = envValue.slice(lastUnescapedDollarSignIndex);

  /**
   * This finds the inner most variable/group divided
   * by variable name and default value (if present)
   * (
   *   (?!(?<=\\))\$        // only match dollar signs that are not escaped
   *   {?                   // optional opening curly brace
   *     ([\w]+)            // match the variable name
   *     (?::-([^}\\]*))?   // match an optional default value
   *   }?                   // optional closing curly brace
   * )
   */
  const matchGroup = /((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/;
  const match = rightMostGroup.match(matchGroup);

  if (match != null) {
    const [, group, variableName, defaultValue] = match;

    return interpolate(
      envValue.replace(group, environment[variableName] || defaultValue || ''),
      environment,
    );
  }
  return envValue;
}

export function isMainThreadElectron(target: Target) {
  return (
    typeof target === 'string' &&
    target.startsWith('electron') &&
    target.endsWith('main')
  );
}
