import rollupPluginBabel from 'rollup-plugin-babel';
import rollupPluginBabelMinify from 'rollup-plugin-babel-minify';
import rollupPluginCommonjs from 'rollup-plugin-commonjs';
import rollupPluginNodeBuiltins from 'rollup-plugin-node-builtins';
import rollupPluginNodeGlobals from 'rollup-plugin-node-globals';
import rollupPluginNodeResolve from 'rollup-plugin-node-resolve';
import rollupPluginTypescript from 'rollup-plugin-typescript';
import typescript from 'typescript';

export default {
  cache: null,
  external: ['socket.io-client'],
  input: `${__dirname}/src/index.ts`,
  onwarn: (warning, onwarn) => {
    if (warning.code === 'THIS_IS_UNDEFINED') {
      return undefined;
    }
    return onwarn(warning.message);
  },
  output: {
    file: `${__dirname}/bundle/index.js`,
    format: 'umd',
    globals: { 'socket.io-client': 'io' },
    name: 'fugleRealtime',
    sourcemap: true,
  },
  plugins: [
    rollupPluginNodeResolve({ jsnext: true, preferBuiltins: false }),
    rollupPluginCommonjs({
      namedExports: {
        lodash: [
          'isBoolean',
          'isEmpty',
          'isFunction',
          'isNumber',
          'isPlainObject',
          'isString',
          'orderBy',
        ],
      },
    }),
    rollupPluginNodeGlobals(),
    rollupPluginNodeBuiltins(),
    rollupPluginTypescript({ typescript, importHelpers: true }),
    rollupPluginBabel({
      babelrc: false,
      exclude: 'node_modules/**',
      plugins: ['external-helpers', ['transform-runtime', { helpers: false, polyfill: false }]],
      presets: [['env', { modules: false }]],
    }),
    rollupPluginBabelMinify({ comments: false }),
  ],
  watch: {
    exclude: 'node_modules/**',
    include: `${__dirname}/src/**`,
  },
};
