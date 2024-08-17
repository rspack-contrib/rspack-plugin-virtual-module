const { rspack } = require('@rspack/core');
const { RspackVirtualModulePlugin } = require('../dist/index.cjs');

const virtualModulePlugin = new RspackVirtualModulePlugin({
  '@theme': 'export default "theme"',
  '@foo/bar': 'export default "foobar"',
});

setTimeout(() => {
  virtualModulePlugin.writeModule('@theme', 'export default "123123"');
}, 2e3);

/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  context: __dirname,
  entry: {
    main: './src/main.jsx',
  },
  resolve: {
    extensions: ['...', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
      {
        test: /\.jsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'ecmascript',
                jsx: true,
              },
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    virtualModulePlugin,
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
  ],
};
