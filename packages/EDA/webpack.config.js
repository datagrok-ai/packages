const path = require('path');
const packageName = path.parse(require('./package.json').name).name.toLowerCase().replace(/-/g, ''); 
const mode = 'development';

module.exports = {
  cache: {
    type: 'filesystem',
  },
  mode: mode,
  entry: {
    test: {filename: 'package-test.js', library: {type: 'var', name:`${packageName}_test`}, import: './src/package-test.ts'},
    package: './src/package.ts'
  },
  resolve: {
    extensions: ['.wasm', '.mjs', '.ts', '.js', '.json', '.tsx'],
  },
  module: {
    rules: [
      {test: /\.js$/, enforce: 'pre', use: ['source-map-loader'], exclude: /node_modules/},
      {test: /\.ts(x?)$/, use: 'ts-loader', exclude: /node_modules/},
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devtool: 'source-map',
  externals: {
    'datagrok-api/dg': 'DG',
    'datagrok-api/grok': 'grok',
    'datagrok-api/ui': 'ui',
    'openchemlib/full.js': 'OCL',
    'rxjs': 'rxjs',
    'rxjs/operators': 'rxjs.operators',
    'cash-dom': '$',
    'dayjs': 'dayjs',
    'wu': 'wu',
    'exceljs': 'ExcelJS',
  },
  output: {
    filename: '[name].js',
    library: packageName,
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
