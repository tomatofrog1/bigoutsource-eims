const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace imports
content = content.replace(
  "import { ReportModal } from '@/src/components/dashboard/ReportModal';",
  `import { 
  TotalPersonnelModal, NewHiresModal, TurnoverRateModal, AssignedAssetsModal,
  WorkforceGrowthModal, EmployeeTurnoverModal, DepartmentDistributionModal,
  WorkArrangementModal, RecentHiresPipelineModal, SecurityComplianceModal,
  ComplianceByDeptModal, SecurityAlertsModal, RecentActivityLogsModal
} from '@/src/components/dashboard/modals';`
);

// 2. Replace state
content = content.replace(
  /const \[selectedReport, setSelectedReport\] = useState<\{[^}]+\} \| null>\(null\);/g,
  "const [activeModal, setActiveModal] = useState<string | null>(null);"
);

// 3. Replace the stats.map onClick
content = content.replace(
  /onClick=\{\(\) => setSelectedReport\(\{[\s\S]*?viewAllLink: stat.viewAllLink\n\s*\}\)\} /g,
  "onClick={() => setActiveModal(stat.label)} "
);

// 4. Replace other hardcoded onClick handlers
const rx = /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setSelectedReport\(\{ title: '([^']+)',[\s\S]*?\}\); \}\}/g;
content = content.replace(rx, "onClick={(e) => { e.stopPropagation(); setActiveModal('$1'); }}");

// 5. Replace the ReportModal at the bottom with all 13 modals
const modalsBlock = `
      <TotalPersonnelModal isOpen={activeModal === 'Total Personnel'} onClose={() => setActiveModal(null)} employees={employees} />
      <NewHiresModal isOpen={activeModal === 'New Hires (30d)'} onClose={() => setActiveModal(null)} recentHires={recentHires} />
      <TurnoverRateModal isOpen={activeModal === 'Turnover Rate'} onClose={() => setActiveModal(null)} employees={employees} turnoverRate={turnoverStats.rate} inactiveEmployees={turnoverStats.inactiveList || []} attritionTimeline={attritionTimeline} />
      <AssignedAssetsModal isOpen={activeModal === 'Assigned Assets'} onClose={() => setActiveModal(null)} devices={devices} employees={employees} />
      
      <WorkforceGrowthModal isOpen={activeModal === 'Workforce Growth Trend'} onClose={() => setActiveModal(null)} employees={employees} />
      <EmployeeTurnoverModal isOpen={activeModal === 'Employee Turnover'} onClose={() => setActiveModal(null)} inactiveEmployees={turnoverStats.inactiveList || []} attritionTimeline={attritionTimeline} />
      
      <DepartmentDistributionModal isOpen={activeModal === 'Department Distribution'} onClose={() => setActiveModal(null)} employees={employees} />
      <WorkArrangementModal isOpen={activeModal === 'Work Arrangement'} onClose={() => setActiveModal(null)} employees={employees} />
      <RecentHiresPipelineModal isOpen={activeModal === 'Recent Hires Pipeline'} onClose={() => setActiveModal(null)} recentHires={recentHires} />
      
      <SecurityComplianceModal isOpen={activeModal === 'Security Compliance'} onClose={() => setActiveModal(null)} devices={devices} employees={employees} />
      <ComplianceByDeptModal isOpen={activeModal === 'Compliance by Dept'} onClose={() => setActiveModal(null)} complianceByDepartment={complianceByDepartment} />
      <SecurityAlertsModal isOpen={activeModal === 'Security Alerts'} onClose={() => setActiveModal(null)} devices={devices} />
      
      <RecentActivityLogsModal isOpen={activeModal === 'Recent Activity Logs'} onClose={() => setActiveModal(null)} logs={logs} />
`;

content = content.replace(
  /<ReportModal[\s\S]*?\/>/g,
  modalsBlock.trim()
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard.tsx updated successfully');
