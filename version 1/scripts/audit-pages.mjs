import fs from 'node:fs';
import path from 'node:path';

const viewsDirectory = path.resolve('views');
const pages = fs.readdirSync(viewsDirectory).filter(file => file.endsWith('.html'));
const failures = [];

for (const page of pages) {
  const source = fs.readFileSync(path.join(viewsDirectory, page), 'utf8');

  for (const match of source.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = match[1].split(/[?#]/)[0];
    if (!href || href.includes('${') || /^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
    const target = href === '/' ? 'index.html' : href;
    if (!fs.existsSync(path.resolve(viewsDirectory, target))) {
      failures.push(`${page}: missing link target ${target}`);
    }
  }

  const inlineScripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(script => script.trim());

  inlineScripts.forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      failures.push(`${page}: inline script ${index + 1} does not parse (${error.message})`);
    }
  });
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Audited ${pages.length} pages: links resolve and inline scripts parse.`);
