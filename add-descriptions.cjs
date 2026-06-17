const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const descriptions = {
  'Workforce Growth Trend': 'Shows the cumulative growth of active employees over time.',
  'Employee Turnover': 'Displays the count of recent separations and offboardings.',
  'Department Distribution': 'Breakdown of personnel assigned to different departments.',
  'Work Arrangement': 'Displays employees grouped by their assigned site (HQ, Candelaria, WFH).',
  'Recent Hires Pipeline': 'Recently onboarded employees in the last 30 days.',
  'Security Compliance': 'Overview of devices missing essential security tooling (ESET, ActivityWatch).',
  'Compliance by Dept': 'Security compliance breakdown segmented by department.',
  'Security Alerts': 'High-priority security risks like missing antivirus or unlicensed OS.',
  'Recent Activity Logs': 'Chronological feed of system interactions and updates.'
};

for (const [title, desc] of Object.entries(descriptions)) {
  const searchStr = "title: '" + title + "',";
  const replaceStr = "title: '" + title + "', description: '" + desc + "',";
  
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
  } else {
    console.log('Failed to find', title);
  }
}

fs.writeFileSync(file, content);
console.log('Done adding descriptions!');
