const fs = require('fs');
const file = '/app/applet/src/lib/offlineSync.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /export async function getLocalBills\(\): Promise<Bill\[\]> \{[\s\S]*?return bills\.sort\(\(a, b\) => b\.createdAt - a\.createdAt\);\n\}/m;
const replacement = `export async function getLocalBills(): Promise<Bill[]> {
  const idb = await initDB();
  const bills = await idb.getAllFromIndex('bills', 'by-date');
  
  const trailingDigitsRegex = /(\\d+)(?=\\D*$)/;

  return bills.sort((a, b) => {
    const matchA = (a.invoiceNumber || '').match(trailingDigitsRegex);
    const numA = matchA && matchA[1] ? parseInt(matchA[1], 10) : 0;
    
    const matchB = (b.invoiceNumber || '').match(trailingDigitsRegex);
    const numB = matchB && matchB[1] ? parseInt(matchB[1], 10) : 0;
    
    if (numB !== numA) {
      return numB - numA;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code);
