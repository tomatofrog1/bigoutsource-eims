import fs from 'fs';
import * as XLSX from 'xlsx';

const sqlContent = fs.readFileSync('/Users/harleyalcos/.gemini/antigravity-ide/brain/5d1df57f-095e-4575-b29e-3e6af88742c5/employees_seed.sql', 'utf8');

const lines = sqlContent.split('\n');
const dataRows = [];

const columns = [
  "id", "name", "account", "site", "status", "phone_number", "address", "bigoutsource_email", "email_password",
  "lms_account", "pc_name", "rustdesk_id", "remote_id", "eset", "bios_date", "activitywatch", "windows_license_key",
  "is_archived", "created_at", "updated_at"
];

dataRows.push(columns);

for (const line of lines) {
  let trimmed = line.trim();
  if (trimmed.startsWith('(')) {
    // remove leading '(' and trailing '),' or ');'
    let inner = trimmed;
    if (inner.endsWith('),')) {
      inner = inner.substring(1, inner.length - 2);
    } else if (inner.endsWith(');')) {
      inner = inner.substring(1, inner.length - 2);
    } else {
      inner = inner.substring(1, inner.length - 1);
    }
    
    const row = [];
    // match strings inside quotes OR null OR boolean
    const regex = /'([^']*)'|null|false|true/g;
    let match;
    while ((match = regex.exec(inner)) !== null) {
      if (match[0] === 'null') row.push('');
      else if (match[0] === 'false') row.push('false');
      else if (match[0] === 'true') row.push('true');
      else row.push(match[1]);
    }
    
    if (row.length === columns.length) {
      dataRows.push(row);
    } else {
      console.warn("Row mismatch length:", row.length, inner);
    }
  }
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(dataRows);
XLSX.utils.book_append_sheet(wb, ws, "Employee Records");

const outputPath = '/Users/harleyalcos/.gemini/antigravity-ide/brain/5d1df57f-095e-4575-b29e-3e6af88742c5/employees_seed.xlsx';
XLSX.writeFile(wb, outputPath);
console.log(`Excel file generated at ${outputPath} with ${dataRows.length - 1} records.`);
