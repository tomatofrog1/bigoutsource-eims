const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

// Replace standard h3 headers that have mb-6
content = content.replace(
  /<h3 className="text-lg font-bold text-\[#111827\] mb-6 flex items-center gap-2">\s*([\s\S]*?)\s*<\/h3>/g,
  `<div className="flex items-center justify-between mb-6">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    $1
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] group-hover:text-[#6366F1] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    Click to View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>`
);

// Replace Department Distribution
content = content.replace(
  /<h3 className="text-lg font-bold text-\[#111827\] flex items-center gap-2">\s*(<BarChart3[\s\S]*?)\s*<\/h3>/g,
  `<div className="flex items-center gap-3">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    $1
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] group-hover:text-[#6366F1] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    Click to View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>`
);

// Replace Recent Activity Logs
content = content.replace(
  /<h3 className="text-lg font-bold text-\[#111827\] flex items-center gap-2">\s*(<Clock[\s\S]*?)\s*<\/h3>/g,
  `<div className="flex items-center gap-3">
  <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
    $1
  </h3>
  <span className="text-[0.625rem] font-black uppercase tracking-wider text-[#9CA3AF] group-hover:text-[#6366F1] transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
    Click to View <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
  </span>
</div>`
);

// Ensure ChevronRight is imported
if (!content.includes('ChevronRight,')) {
  content = content.replace('import { ', 'import { ChevronRight, ');
}

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf-8');
console.log('Added click hints explicitly!');
