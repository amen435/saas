import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

async function extract() {
  const buf = await fs.readFile('d:\\\\Saas\\\\saas\\\\Secure Full-Stack Development.pdf');
  const pdfFunc = typeof pdfModule === 'function' ? pdfModule : (pdfModule.default || pdfModule.pdf);
  console.log('Type of pdfFunc:', typeof pdfFunc);
  const data = await pdfFunc(buf);
  await fs.writeFile('d:\\\\Saas\\\\saas\\\\pdf_text.txt', data.text);
  console.log('PDF extracted successfully.');
}
extract().catch(console.error);
