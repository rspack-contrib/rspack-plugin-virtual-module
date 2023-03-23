const { RspackVirtualModulePlugin } = require('../dist');
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
  plugins: [
    new RspackVirtualModulePlugin({
      '@theme': 'export default "123123"',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
    ],
  },
};
