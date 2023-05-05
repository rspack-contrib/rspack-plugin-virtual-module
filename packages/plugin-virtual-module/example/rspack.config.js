const { RspackVirtualModulePlugin } = require('../dist');

const vmp = new RspackVirtualModulePlugin({
  '@theme': 'export default "theme"',
});

setTimeout(() => {
  vmp.writeModule('a', 'export default "123123"');
}, 2e3);

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  context: __dirname,
  entry: {
    main: './src/main.jsx',
  },
  builtins: {
    html: [
      {
        template: './index.html',
      },
    ],
  },
  plugins: [vmp],
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
    ],
  },
};
