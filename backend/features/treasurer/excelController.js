const multer = require('multer');
const xlsx = require('xlsx');

// Configuration for memory storage
const storage = multer.memoryStorage();
exports.upload = multer({ storage });

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a valid .xlsx file.' });
    }
    
    // Parse the Excel file from memory buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const eventId = req.body?.eventId;

    // MVP: if eventId is not provided, just return preview.
    if (!eventId) {
      return res.status(200).json({
        message: 'Excel file processed successfully (preview only - provide eventId to save roster).',
        recordCount: data.length,
        dataPreview: data.slice(0, 5),
      });
    }

    const Event = require("../events/Event");
    const Student = require("../../src/models/student");
    const EventParticipant = require("../../src/models/eventParticipant");

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const asString = (v) => (v === null || v === undefined ? "" : String(v).trim());
    const parseGender = (v) => {
      const s = asString(v).toLowerCase();
      if (s === "male" || s === "m") return "Male";
      if (s === "female" || s === "f") return "Female";
      if (s === "other" || s === "o") return "Other";
      return "";
    };
    const parseParticipate = (v) => {
      const s = asString(v).toLowerCase();
      if (["yes", "y", "1", "true", "participate", "participating"].includes(s)) return true;
      if (["no", "n", "0", "false", "not participate"].includes(s)) return false;
      // If empty -> false
      if (!s) return false;
      // If value looks numeric
      const num = Number(s);
      if (Number.isFinite(num)) return num !== 0;
      return false;
    };

    const getField = (row, keys) => {
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
      }
      return undefined;
    };

    let createdCount = 0;
    let skippedCount = 0;
    let errorRows = [];

    const rows = Array.isArray(data) ? data : [];

    // eslint-disable-next-line no-restricted-syntax
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = asString(getField(row, ["Name", "name"]));
      const regNo = asString(getField(row, ["reg no", "regNo", "regno", "registerNumber", "register no", "reg no "]));
      const dept = asString(getField(row, ["dept", "department"]));
      const batch = asString(getField(row, ["batch"]));
      const genderRaw = getField(row, ["gender"]);
      const participateRaw = getField(row, ["participate"]);

      const gender = parseGender(genderRaw);
      const participate = parseParticipate(participateRaw);

      if (!regNo || regNo.length < 10) {
        errorRows.push({ rowIndex: i + 2, error: "Missing/invalid reg no", regNo });
        continue;
      }
      if (!gender) {
        errorRows.push({ rowIndex: i + 2, error: "Missing/invalid gender", gender: asString(genderRaw) });
        continue;
      }

      const student = await Student.findOne({ registerNumber: regNo });
      if (!student) {
        skippedCount++;
        continue;
      }

      // Upsert roster row for idempotency.
      const result = await EventParticipant.updateOne(
        { event: event._id, student: student._id },
        {
          $set: {
            studentRegNo: regNo,
            name: name || student.fullName,
            department: dept || student.department,
            batch: batch || student.year,
            gender: student.gender || gender,
            participate,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount && result.upsertedCount > 0) createdCount++;
    }

    const Log = require("../admin/Log");
    await Log.create({
      action: "Event roster imported from Excel",
      performedBy: req.user?._id,
      details: {
        eventId: event._id,
        recordCount: rows.length,
        createdCount,
        skippedCount,
        errorCount: errorRows.length,
      },
    });

    return res.status(200).json({
      message: "Roster imported from Excel successfully",
      recordCount: rows.length,
      createdCount,
      skippedCount,
      errors: errorRows.slice(0, 20),
      errorCount: errorRows.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process Excel file', details: err.message });
  }
};
