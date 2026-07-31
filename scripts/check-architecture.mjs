import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src/app', 'src/features', 'src/components'];
const files = [];
function walk(path) {
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file)) files.push(file);
  }
}
roots.forEach(walk);
const violations = files.filter((file) => /from ['"]@\/database\//.test(readFileSync(file, 'utf8')));
if (violations.length) {
  console.error(`Persistence boundary violated by:\n${violations.join('\n')}`);
  process.exit(1);
}
const colorViolations = files.filter((file) => /#[\da-fA-F]{3,8}\b/.test(readFileSync(file, 'utf8')));
if (colorViolations.length) {
  console.error(`Raw color token found outside theme:\n${colorViolations.join('\n')}`);
  process.exit(1);
}
console.log(`Architecture boundary verified across ${files.length} UI files.`);
