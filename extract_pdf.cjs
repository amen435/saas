const fs = require('fs');
const pdf = require('pdf-parse');
let buf = fs.readFileSync('d:\\\\Saas\\\\saas\\\\Secure Full-Stack Development.pdf');
pdf(buf).then(data => {
  fs.writeFileSync('d:\\\\Saas\\\\saas\\\\pdf_text.txt', data.text);
  console.log('PDF extracted successfully.');
}).catch(console.error);
