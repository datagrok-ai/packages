const path = require('path');
const packageName = path.parse(require('./package.json').name).name.toLowerCase().replace(/-/g, '');

module.exports = {
  cache: {
    type: 'filesystem',
  },
  mode: 'development',
  entry: {
    test: {filename: 'package-test.js', library: {type: 'var', name: `${packageName}_test`}, import: './src/package-test.ts'},
    package: './src/package.ts',
  },
  resolve: {
    extensions: ['.wasm', '.mjs', '.ts', '.json', '.js', '.tsx', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env', 
                '@babel/preset-react', 
                '@babel/preset-typescript'
              ],
              plugins: [
                '@babel/plugin-transform-runtime',
                '@babel/plugin-proposal-class-properties'
              ]
            }
          }
        ]
      },
      {test: /\.css$/, use: ['style-loader', 'css-loader']},
    ],
  },
  plugins: [
  ],
  devtool: 'source-map',
  externals: {
    'datagrok-api/dg': 'DG',
    'datagrok-api/grok': 'grok',
    'datagrok-api/ui': 'ui', 
    'cash-dom': '$',
    'dayjs': 'dayjs',
    'wu': 'wu',
    'exceljs': 'ExcelJS',
    'html2canvas': 'html2canvas',
  },
  output: {
    filename: '[name].js',
    library: packageName,
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
