const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    jsonPlaceholderSimulation: './src/simulations/jsonPlaceholderSimulation.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'web',
  externals: /^(k6|https?\:\/\/)(\/.*)?/
};
