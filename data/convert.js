const XLSX = require("xlsx");
const fs = require("fs");

function convertExcelToJson(inputFile, outputFile) {
    const workbook = XLSX.readFile(inputFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // raw:false → keeps formatted date strings (e.g. 15-6-2005 instead of 38518)
    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

    fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 4));
    console.log(`Converted ${inputFile} → ${outputFile}`);
}

convertExcelToJson("C:/Users/mmaha/Budget/user.xlsx", "C:/Users/mmaha/Budget/user.json");
convertExcelToJson("C:/Users/mmaha/Budget/student.xlsx", "C:/Users/mmaha/Budget/student.json");
