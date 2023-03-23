# rspack-plugin-virtual-module

A plugin for rspack that allows you to create virtual modules.

## Installation

```bash
# npm
npm install rspack-plugin-virtual-module
# yarn
yarn add rspack-plugin-virtual-module
# pnpm
pnpm add rspack-plugin-virtual-module
```

## Usage

```js
const VirtualModulePlugin = require('rspack-plugin-virtual-module');
// rspack.config.js
module.exports = {
  plugins: [
    new VirtualModulePlugin({
      contents: 'export default "Hello World";',
    }),
  ],
};
```

Then you can import the virtual module in your code:

```js
import hello from 'contents';

console.log(hello); // "Hello World"
```
