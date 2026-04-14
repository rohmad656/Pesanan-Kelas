const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /bg-\[#190622\]/g, to: 'bg-slate-50 dark:bg-[#190622]' },
  { from: /bg-\[#20082b\]/g, to: 'bg-white dark:bg-[#20082b]' },
  { from: /text-\[#f9dcff\]/g, to: 'text-slate-900 dark:text-[#f9dcff]' },
  { from: /text-\[#ca9ada\]/g, to: 'text-slate-600 dark:text-[#ca9ada]' },
  { from: /border-\[#603770\]\/30/g, to: 'border-slate-200 dark:border-[#603770]/30' },
  { from: /border-\[#603770\]\/50/g, to: 'border-slate-200 dark:border-[#603770]/50' },
  { from: /bg-\[#3b134b\]/g, to: 'bg-purple-100 dark:bg-[#3b134b]' },
  { from: /text-\[#d1a6ff\]/g, to: 'text-purple-700 dark:text-[#d1a6ff]' },
  { from: /bg-\[#321040\]/g, to: 'bg-slate-100 dark:bg-[#321040]' },
  { from: /text-\[#ffafd5\]/g, to: 'text-pink-600 dark:text-[#ffafd5]' },
  { from: /text-\[#86d2ff\]/g, to: 'text-blue-600 dark:text-[#86d2ff]' },
  { from: /border-\[#d1a6ff\]\/30/g, to: 'border-purple-300 dark:border-[#d1a6ff]/30' },
  { from: /border-\[#d1a6ff\]/g, to: 'border-purple-400 dark:border-[#d1a6ff]' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/pages');

files.forEach(file => {
  if (file.includes('Landing.tsx')) return; // Skip Landing.tsx as it's already updated
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  replacements.forEach(r => {
    if (r.from.test(content)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
