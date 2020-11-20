const { DefinePlugin } = require('webpack');
const { join } = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  entry: {
    directline: './lib/directLine.js'
  },
  externals: ['net'],
  mode: 'production',
  output: {
    filename: '[name].js',
    library: 'DirectLine',
    libraryTarget: 'umd',
    path: join(__dirname, 'dist')
  },
  plugins: [
    new DefinePlugin({
      'process.env': {
        'VERSION': JSON.stringify(process.env.npm_package_version)
      }
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static'
    })
  ]
};
