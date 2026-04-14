const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /dark:bg-\[#190622\]/g, to: 'dark:bg-[#1E1E2F]' },
  { from: /dark:bg-\[#20082b\]/g, to: 'dark:bg-[#27273A] dark:shadow-lg dark:shadow-black/20' },
  { from: /dark:bg-\[#3b134b\]/g, to: 'dark:bg-[#32324A]' },
  { from: /dark:bg-\[#321040\]/g, to: 'dark:bg-[#2D2D44]' },
  { from: /dark:text-\[#f9dcff\]/g, to: 'dark:text-[#F5F5F5]' },
  { from: /dark:text-\[#ca9ada\]/g, to: 'dark:text-[#B4B4C8]' },
  { from: /dark:border-\[#603770\]/g, to: 'dark:border-[#3F3F5A]' },
  { from: /dark:border-\[#d1a6ff\]/g, to: 'dark:border-[#6A5ACD]' },
  { from: /dark:text-\[#d1a6ff\]/g, to: 'dark:text-[#9D8DF1]' },
  { from: /dark:text-\[#3a0a67\]/g, to: 'dark:text-white' },
  { from: /dark:hover:bg-\[#3b134b\]/g, to: 'dark:hover:bg-[#32324A]' },
  { from: /dark:hover:bg-\[#321040\]/g, to: 'dark:hover:bg-[#2D2D44]' },
  { from: /dark:hover:text-\[#d1a6ff\]/g, to: 'dark:hover:text-[#9D8DF1]' },
  { from: /dark:hover:text-\[#f9dcff\]/g, to: 'dark:hover:text-[#F5F5F5]' },
  { from: /dark:hover:border-\[#d1a6ff\]/g, to: 'dark:hover:border-[#6A5ACD]' },
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

const files = [...walk('./src/pages'), ...walk('./src/components')];

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
    console.log('Updated dark mode in', file);
  }
});
