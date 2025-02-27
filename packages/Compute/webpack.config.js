const path = require('path');
const packageName = path.parse(require('./package.json').name).name.toLowerCase().replace(/-/g, '');

module.exports = {
  mode: 'production',
  entry: {
    test: {
      filename: 'package-test.js',
      library: {type: 'var', name: `${packageName}_test`},
      import: './src/package-test.ts',
    },
    package: './src/package.ts',
  },
  resolve: {
    extensions: ['.wasm', '.ts', '.tsx', '.mjs', '.js', '.jsx',  '.json'],
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: 'ts-loader', options: {allowTsInNodeModules: true}},
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(ts|tsx|mjs|js|jsx)$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
    ],
  },
  devtool: 'source-map',
  externals: {                    // external modules won't be loaded to the output, but taken from the environment
    'datagrok-api/dg': 'DG',
    'datagrok-api/grok': 'grok',
    'datagrok-api/ui': 'ui',
    'openchemlib/full.js': 'OCL',
    'rxjs': 'rxjs',
    'rxjs/operators': 'rxjs.operators',
    'cash-dom': '$',
    'dayjs': 'dayjs',
    'wu': 'wu',
    'exceljs': 'ExcelJS'
  },
  output: {
    filename: '[name].js',
    library: 'compute',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    usedExports: true,
    concatenateModules: false,
  }
};
