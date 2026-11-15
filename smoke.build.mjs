import { build } from 'esbuild'

const outfile = process.argv[2] ?? '/tmp/smoke-check.cjs'

await build({
  entryPoints: ['smoke.tsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.env': '{}' },
  outfile,
  logLevel: 'error',
  plugins: [
    {
      name: 'css-stub',
      setup(b) {
        b.onResolve({ filter: /\.css$/ }, () => ({ path: 'css-stub', namespace: 'css-stub' }))
        b.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({
          contents: 'export default {};',
          loader: 'js',
        }))
      },
    },
  ],
})
