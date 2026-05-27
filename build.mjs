import esbuild from 'esbuild'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

await esbuild.build({
  entryPoints: [join(__dirname, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: join(__dirname, 'dist/index.js'),
  format: 'esm',
  minify: true,
  external: ['sql.js', 'sharp', 'tesseract.js'],
  logLevel: 'info',
})

copyFileSync(
  join(__dirname, '.env'),
  join(__dirname, 'dist/.env')
)