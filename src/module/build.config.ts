import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  outDir: '../../dist/module',
  externals: [
    'ufo',
    'defu',
    'destr',
    'unstorage',
    'unstorage/drivers/fs',
    'chokidar',
    'anymatch',
    'readdirp',
    'picomatch',
    'normalize-path',
  ],
  entries: [
    './src/module',
    {
      input: './src/runtime/',
      outDir: `../../dist/module/runtime`,
      addRelativeDeclarationExtensions: true,
      ext: 'js',
      pattern: [
        '**',
        '!**/*.stories.{js,cts,mts,ts,jsx,tsx}', // ignore storybook files
        '!**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}', // ignore tests
      ],
      esbuild: {
        jsxImportSource: 'vue',
        jsx: 'automatic',
        jsxFactory: 'h',
      },
    },
  ],
})
