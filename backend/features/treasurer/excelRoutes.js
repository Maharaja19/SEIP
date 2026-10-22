const express = require('express');
const router = express.Router();
const excelController = require('./excelController');
const { roleCheck } = require('../roles/roleMiddleware');

router.post('/upload', roleCheck(['treasurer', 'admin']), excelController.upload.single('file'), excelController.uploadExcel);

module.exports = router;
