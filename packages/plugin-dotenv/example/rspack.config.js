const { DotenvPlugin } = require('../dist');
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
    new DotenvPlugin({
      expand: true,
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
