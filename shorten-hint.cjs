const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
content = content.replace(/Click to View/g, 'View');
fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf-8');
console.log('Replaced Click to View with View!');
