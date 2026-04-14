const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /dark:bg-slate-100 dark:bg-\[#321040\]/g, to: 'dark:bg-[#321040]' },
  { from: /dark:bg-white dark:bg-\[#20082b\]/g, to: 'dark:bg-[#20082b]' },
  { from: /dark:text-slate-900 dark:text-\[#f9dcff\]/g, to: 'dark:text-[#f9dcff]' },
  { from: /dark:text-slate-600 dark:text-\[#ca9ada\]/g, to: 'dark:text-[#ca9ada]' },
  { from: /dark:border-slate-200 dark:border-\[#603770\]/g, to: 'dark:border-[#603770]' },
  { from: /dark:hover:bg-purple-100 dark:bg-\[#3b134b\]/g, to: 'dark:hover:bg-[#3b134b]' },
  { from: /dark:border-purple-400 dark:border-\[#d1a6ff\]/g, to: 'dark:border-[#d1a6ff]' },
  { from: /dark:text-slate-900 dark:text-\[#f9dcff\]/g, to: 'dark:text-[#f9dcff]' },
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
    console.log('Cleaned up', file);
  }
});
