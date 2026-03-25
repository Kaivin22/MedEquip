const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('e:/Quản lý thiết bị y tế/BM06_Phan_Cong_Cong_Viec_v2.xlsx');
  workbook.SheetNames.forEach(sheetName => {
    console.log('--- SHEET:', sheetName, '---');
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(JSON.stringify(data.slice(0, 50), null, 2)); // Print first 50 rows
  });
} catch (err) {
  console.error("Error reading excel:", err);
}
