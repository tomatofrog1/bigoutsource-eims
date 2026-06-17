const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  'Workforce Growth Trend': \`insights: [
      { label: 'Total Workforce', value: employees.length, colorClass: 'text-indigo-600' },
      { label: 'Active Personnel', value: employees.filter(e => e.status === 'active').length, colorClass: 'text-green-600' },
      { label: 'Recent Hires (30d)', value: recentHires.length, colorClass: 'text-blue-600' }
    ]\`,
  'Employee Turnover': \`insights: [
      { label: 'Total Separations', value: turnoverStats.inactive, colorClass: 'text-red-600' },
      { label: 'Turnover Rate', value: turnoverStats.rate + '%', colorClass: 'text-orange-600' }
    ]\`,
  'Department Distribution': \`insights: [
      { label: 'Active Departments', value: new Set(employees.filter(e => e.accountAssignment).map(e => e.accountAssignment)).size, colorClass: 'text-indigo-600' },
      { label: 'Unassigned Personnel', value: employees.filter(e => !e.accountAssignment).length, colorClass: 'text-orange-600' }
    ]\`,
  'Work Arrangement': \`insights: [
      { label: 'HQ Staff', value: employees.filter(e => e.site === 'HQ').length, colorClass: 'text-indigo-600' },
      { label: 'Candelaria Staff', value: employees.filter(e => e.site === 'Candelaria').length, colorClass: 'text-blue-600' },
      { label: 'Hybrid/WFH', value: employees.filter(e => e.site === 'Hybrid' || e.site === 'WFH').length, colorClass: 'text-emerald-600' }
    ]\`,
  'Recent Hires Pipeline': \`insights: [
      { label: 'Total Hires (30d)', value: recentHires.length, colorClass: 'text-green-600' },
      { label: 'Hires This Week', value: recentHires.filter(e => new Date(e.createdAt || e.created_at) >= new Date(Date.now() - 7*24*60*60*1000)).length, colorClass: 'text-blue-600' }
    ]\`,
  'Security Compliance': \`insights: [
      { label: 'Compliant Devices', value: devices.filter(d => d.esetStatus?.toLowerCase() === 'active' && d.activityWatchStatus?.toLowerCase() === 'installed').length, colorClass: 'text-green-600' },
      { label: 'Non-Compliant', value: devices.filter(d => d.esetStatus?.toLowerCase() !== 'active' || d.activityWatchStatus?.toLowerCase() !== 'installed').length, colorClass: 'text-red-600' }
    ]\`,
  'Compliance by Dept': \`insights: [
      { label: 'Compliant Devices', value: devices.filter(d => d.esetStatus?.toLowerCase() === 'active' && d.activityWatchStatus?.toLowerCase() === 'installed').length, colorClass: 'text-green-600' },
      { label: 'Non-Compliant', value: devices.filter(d => d.esetStatus?.toLowerCase() !== 'active' || d.activityWatchStatus?.toLowerCase() !== 'installed').length, colorClass: 'text-red-600' }
    ]\`,
  'Security Alerts': \`insights: [
      { label: 'Missing ESET', value: devices.filter(d => d.esetStatus?.toLowerCase() !== 'active').length, colorClass: 'text-red-600' },
      { label: 'Missing ActivityWatch', value: devices.filter(d => d.activityWatchStatus?.toLowerCase() !== 'installed').length, colorClass: 'text-orange-600' },
      { label: 'Unlicensed OS', value: devices.filter(d => !d.windowsKey).length, colorClass: 'text-yellow-600' }
    ]\`,
  'Recent Activity Logs': \`insights: [
      { label: 'Total Logs', value: logs.length, colorClass: 'text-gray-800' },
      { label: 'Logs Today', value: logs.filter(l => new Date(l.createdAt || l.timestamp).toDateString() === new Date().toDateString()).length, colorClass: 'text-blue-600' }
    ]\`
};

for (const [title, insightsStr] of Object.entries(replacements)) {
  const searchStr = \`title: '\${title}',\`;
  const replaceStr = \`title: '\${title}', \${insightsStr},\`;
  
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
  } else {
    console.log('Failed to find', title);
  }
}

fs.writeFileSync(file, content);
console.log('Done adding insights arrays!');
