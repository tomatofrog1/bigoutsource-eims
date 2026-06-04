import fs from 'fs';

const firstNames = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Miguel', 'Carmela', 'Luis', 'Teresa',
  'Carlos', 'Lourdes', 'Antonio', 'Belen', 'Francisco', 'Cecilia', 'Manuel', 'Elena', 'Ricardo', 'Flora',
  'Eduardo', 'Gloria', 'Roberto', 'Imelda', 'Fernando', 'Jocelyn', 'Vicente', 'Luz', 'Arturo', 'Marites',
  'Dennis', 'Erlinda', 'Joel', 'Nenita', 'Romeo', 'Rosario', 'Edgar', 'Susan', 'Rene', 'Teresita',
  'Ramon', 'Victoria', 'Cesar', 'Wilma', 'Reynaldo', 'Yolanda', 'Mario', 'Zenaida', 'Ernesto', 'Cynthia',
  'Rey', 'Marilyn', 'Danilo', 'Leonora', 'Efren', 'Aida', 'Rolando', 'Carmen', 'Oscar', 'Estrella',
  'Rafael', 'Fe', 'Tomas', 'Gina', 'Domingo', 'Loida', 'Emilio', 'Lorna', 'Ruben', 'Lydia',
  'Nicanor', 'Mila', 'Salvador', 'Myrna', 'Severino', 'Norma'
];

const lastNames = [
  'Dela Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Santos', 'Flores', 'Gonzales', 'Bautista', 'Villanueva',
  'Fernandez', 'Cruz', 'De Leon', 'Aquino', 'Ocampo', 'Tolentino', 'Domingo', 'Gomez', 'Chua', 'Diaz',
  'Navarro', 'Torres', 'Castillo', 'Mercado', 'Reyes', 'Lim', 'Tan', 'Soriano', 'Cabrera', 'Morales',
  'Perez', 'Miranda', 'Roxas', 'Cortez', 'Sison', 'Salazar', 'Rivera', 'Del Rosario', 'Alvarez', 'San Jose',
  'Pascual', 'Espiritu', 'Aguilar', 'Pineda', 'Guzman', 'Valdez', 'Abad', 'Evangelista', 'Navarro', 'Mariano',
  'Santiago', 'Guerrero', 'Manalo', 'Reyes', 'Magno', 'David', 'De Guzman', 'Panganiban', 'Ferrer', 'Alcantara'
];

const departments = [
  'Carrot Top', 'Health Carousel', 'HR Department', 'Finance Department', 
  'IT Department', 'Accounting Department', 'Marketing Department', 'Cypher Billing'
];

const sites = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];
const statuses = ['active', 'inactive'];

const optionalFieldsKeys = [
  'phone', 'address', 'email', 'emailPassword', 'lms', 'pc', 'rustdesk', 'remote', 'biosDate', 'winKey'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

const startDate = new Date('2026-01-01T00:00:00.000Z');
const endDate = new Date('2026-06-04T00:00:00.000Z');

let sql = `-- TRUNCATE ONLY the employees table
TRUNCATE TABLE public.employees CASCADE;

-- Insert diverse employees with created_at dates spread across the last 6 months (Jan 2026 - Jun 2026)
INSERT INTO public.employees (
  id, name, account, site, status, phone_number, address, bigoutsource_email, email_password,
  lms_account, pc_name, rustdesk_id, remote_id, eset, bios_date, activitywatch, windows_license_key,
  is_archived, created_at, updated_at
) VALUES
`;

const numEmployees = 75;
const numWithMissing = 35;

// Pick 35 random indices
const indices = Array.from({length: numEmployees}, (_, i) => i + 1);
shuffle(indices);
const missingDataIndices = new Set(indices.slice(0, numWithMissing));

const values = [];

for (let i = 1; i <= numEmployees; i++) {
  const idStr = `BOSS${i.toString().padStart(3, '0')}`;
  const firstName = getRandomItem(firstNames);
  const lastName = getRandomItem(lastNames);
  const fullName = `${firstName} ${lastName}`;
  const account = getRandomItem(departments);
  const site = getRandomItem(sites);
  const status = Math.random() < 0.85 ? 'active' : 'inactive';
  
  const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/ /g, '')}`;
  
  let data = {
    phone: '09' + Math.floor(100000000 + Math.random() * 900000000),
    address: 'Laguna, Philippines',
    email: `${emailName}@bigoutsource.com`,
    emailPassword: 'Passw0rd123!',
    lms: `${emailName}_lms`,
    pc: `PC-${account.substring(0, 3).toUpperCase()}-${i.toString().padStart(3, '0')}`,
    rustdesk: Math.floor(100000000 + Math.random() * 900000000).toString(),
    remote: `remote-${i}`,
    biosDate: new Date('2023-01-01T00:00:00Z').toISOString().split('T')[0],
    winKey: `W8KH2-T9M8Q-${Math.floor(Math.random()*90000)+10000}-${Math.floor(Math.random()*90000)+10000}`
  };

  if (missingDataIndices.has(i)) {
    const numMissing = Math.floor(Math.random() * 4) + 2; // 2 to 5
    const fieldsToDrop = shuffle([...optionalFieldsKeys]).slice(0, numMissing);
    fieldsToDrop.forEach(f => {
      data[f] = null;
    });
  }

  const eset = Math.random() < 0.9 ? 'active' : 'inactive';
  const activityWatch = Math.random() < 0.9 ? 'installed' : 'missing';
  const isArchived = status === 'inactive' ? (Math.random() < 0.5) : false;
  
  const createdAt = getRandomDate(startDate, endDate);
  const createdStr = createdAt.toISOString().replace('T', ' ').substring(0, 19);

  // Format correctly for SQL
  const fmt = (val) => val === null ? 'null' : `'${val}'`;

  values.push(`  ('${idStr}', '${fullName}', '${account}', '${site}', '${status}', ${fmt(data.phone)}, ${fmt(data.address)}, ${fmt(data.email)}, ${fmt(data.emailPassword)}, ${fmt(data.lms)}, ${fmt(data.pc)}, ${fmt(data.rustdesk)}, ${fmt(data.remote)}, '${eset}', ${fmt(data.biosDate)}, '${activityWatch}', ${fmt(data.winKey)}, ${isArchived}, '${createdStr}', '${createdStr}')`);
}

sql += values.join(',\n') + ';\n';

const outputPath = '/Users/harleyalcos/.gemini/antigravity-ide/brain/5d1df57f-095e-4575-b29e-3e6af88742c5/employees_seed.sql';
fs.writeFileSync(outputPath, sql);
console.log(`Generated 75 employees successfully at ${outputPath}`);
