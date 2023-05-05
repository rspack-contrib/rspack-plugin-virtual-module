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
const { RspackVirtualModulePlugin } = require('rspack-plugin-virtual-module');
// rspack.config.js
module.exports = {
  plugins: [
    new RspackVirtualModulePlugin({
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

If you want to dynamically write the contents of the virtual module, you can use the `writeModule` method:

```js
// rspack.config.js
const { RspackVirtualModulePlugin } = require('rspack-plugin-virtual-module');

const vmp = new RspackVirtualModulePlugin({
  contents: 'export default "Hello World";',
});

// Write the contents of the virtual module after 1 second
setTimeout(() => {
  vmp.writeModule('export default "Hello World 2";');
}, 1000);

module.exports = {
  plugins: [vmp],
};
```
