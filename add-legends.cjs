const fs = require('fs');
const path = require('path');

const modalsDir = path.join(__dirname, 'src/components/dashboard/modals');
const files = fs.readdirSync(modalsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(modalsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Ensure Legend is imported
  if (content.includes("'recharts'") && !content.includes('Legend,')) {
    content = content.replace(/(import\s+{.*?)(}\s+from\s+'recharts';)/s, (match, p1, p2) => {
      if (!p1.includes('Legend')) {
        return `${p1}, Legend ${p2}`;
      }
      return match;
    });
    modified = true;
  }

  // Insert <Legend /> after <Tooltip ... /> if it doesn't already exist
  const regex = /(<Tooltip[^>]*\/>)(\s*)(?!<Legend)/g;
  if (regex.test(content)) {
    content = content.replace(regex, `$1$2<Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />$2`);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
