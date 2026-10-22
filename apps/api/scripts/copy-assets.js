const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'modules', 'sentinel-ai', 'models');
const dest = path.join(__dirname, '..', 'dist', 'modules', 'sentinel-ai', 'models');

if (fs.existsSync(src)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, errorOnExist: false });
  console.log('✅ Sentinel AI models copied to dist successfully');
}
