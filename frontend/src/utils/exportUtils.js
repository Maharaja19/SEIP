import XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the file
 * @param {String} sheetName - Name of the sheet
 */
export const exportToExcel = (data, filename = 'export', sheetName = 'Sheet1') => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

/**
 * Export multiple sheets to Excel
 * @param {Object} sheets - Object with sheet names and data
 * @param {String} filename - Name of the file
 */
export const exportMultipleSheetsToExcel = (sheets, filename = 'export') => {
  try {
    const wb = XLSX.utils.book_new();
    
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting multiple sheets:', error);
    return false;
  }
};

/**
 * Format currency for Excel
 * @param {Number} amount 
 * @returns {String}
 */
export const formatCurrency = (amount) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Format date for Excel
 * @param {Date|string} date 
 * @returns {String}
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN');
};
