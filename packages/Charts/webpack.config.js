const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    package: './src/package.ts'
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ]
  },
  // devtool: 'inline-source-map',
  externals: {
    'datagrok-api/dg': 'DG',
    'datagrok-api/grok': 'grok',
    'datagrok-api/ui': 'ui',
    "openchemlib/full.js": "OCL",
    "rxjs": "rxjs",
    "rxjs/operators": "rxjs.operators"
  },
  output: {
    filename: '[name].js',
    library: 'charts',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
