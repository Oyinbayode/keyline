import { mkdirSync, writeFileSync } from 'node:fs';
import { bundle } from 'lightningcss';

const stylesheets = {
  'styles.css': 'src/styles/index.css',
  'tokens.css': 'src/styles/tokens.css',
};

mkdirSync('dist', { recursive: true });

for (const [outputName, sourcePath] of Object.entries(stylesheets)) {
  const { code } = bundle({ filename: sourcePath });
  writeFileSync(`dist/${outputName}`, code);
  console.log(`dist/${outputName}  ${(code.byteLength / 1024).toFixed(2)} kB`);
}
