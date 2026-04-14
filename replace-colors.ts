import fs from 'fs';
import path from 'path';

const directory = './src';

const replacements = [
  { regex: /text-\[\#9D8DF1\]/g, replacement: 'text-brand-dark-accent' },
  { regex: /border-\[\#6A5ACD\]/g, replacement: 'border-brand-dark-accent' },
  { regex: /bg-\[\#d1a6ff\]/g, replacement: 'bg-brand-dark-accent-light' },
  { regex: /text-\[\#3a0a67\]/g, replacement: 'text-brand-dark-on-accent' },
  { regex: /bg-\[\#c597f6\]/g, replacement: 'bg-brand-dark-accent-hover' },
  { regex: /bg-\[\#4a1f76\]/g, replacement: 'bg-brand-dark-hover' },
  { regex: /shadow-\[\#d1a6ff\]/g, replacement: 'shadow-brand-dark-accent-light' },
  { regex: /decoration-\[\#d1a6ff\]/g, replacement: 'decoration-brand-dark-accent-light' },
  { regex: /ring-\[\#d1a6ff\]/g, replacement: 'ring-brand-dark-accent-light' },
  { regex: /border-\[\#603770\]/g, replacement: 'border-brand-dark-border-strong' },
  { regex: /text-purple-/g, replacement: 'text-brand-' },
  { regex: /bg-purple-/g, replacement: 'bg-brand-' },
  { regex: /border-purple-/g, replacement: 'border-brand-' },
  { regex: /ring-purple-/g, replacement: 'ring-brand-' },
  { regex: /shadow-purple-/g, replacement: 'shadow-brand-' },
  { regex: /from-purple-/g, replacement: 'from-brand-' },
  { regex: /via-purple-/g, replacement: 'via-brand-' },
  { regex: /to-purple-/g, replacement: 'to-brand-' },
];

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
