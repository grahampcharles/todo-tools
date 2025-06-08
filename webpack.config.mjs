import path from 'path';
import { fileURLToPath } from 'url';

/** @typedef {import('webpack').Configuration} WebpackConfig */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@src': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: ['ts-loader']
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log'
  }
};

export default [extensionConfig];
