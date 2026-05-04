import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as ExcelJS from "exceljs";
import * as corsLib from "cors";

admin.initializeApp();

// cors is a CommonJS module; use .default when imported with `* as`
const cors = (corsLib as unknown as typeof corsLib.default)({ origin: true });

/**
 * Migration: .NET Backend to Firebase Cloud Functions (Serverless)
 * Logic: Excel Template Mutation with Business Day Calculation.
 */

// --- Business Logic Engine ---

/**
 * Calculates target date skipping weekends and holidays.
 */
function calculateTargetDate(startDate: Date, daysToAdd: number, holidays: Date[]): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay(); // 0: Sunday, 6: Saturday
    
    const isHoliday = holidays.some(h => 
      h.getFullYear() === result.getFullYear() &&
      h.getMonth() === result.getMonth() &&
      h.getDate() === result.getDate()
    );

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
      addedDays++;
    }
  }
  return result;
}

// --- Main Cloud Function ---

export const generateSchedule = onRequest(async (req: any, res: any) => {
  return cors(req, res, async () => {
    try {
      // 1. Authorization Validation
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).send({ error: "Unauthorized" });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch (e) {
        res.status(401).send({ error: "Invalid Token" });
        return;
      }

      // 2. Input Parsing
      const { fileBase64, startDateStr } = req.body;
      if (!fileBase64 || !startDateStr) {
        res.status(400).send({ error: "Missing required fields" });
        return;
      }

      const startDate = new Date(startDateStr);
      const buffer = Buffer.from(fileBase64, "base64");

      // 3. Fetch Holidays from Firestore
      const holidaySnapshot = await admin.firestore().collection("holidays").get();
      const holidays = holidaySnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => new Date(doc.data().date));

      // 4. Excel Processing (ExcelJS)
      const workbook = new ExcelJS.Workbook();
      // ExcelJS expects its own Buffer type; convert via Uint8Array to satisfy types
      await workbook.xlsx.load(new Uint8Array(buffer) as unknown as ExcelJS.Buffer);
      const worksheet = workbook.worksheets[0];

      // --- Step 1: Detect Headers Dynamically ---
      let colDesc = 2, colResp = 3, colSusp = 4, colCalDays = 5, colDate = 6, colPolicy = 7;
      let headerRowNumber = -1;

      worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (headerRowNumber !== -1) return;
        row.eachCell((cell: ExcelJS.Cell) => {
          const txt = cell.text?.toLowerCase() || "";
          // cell.col can be string in some ExcelJS versions; coerce to number
          if (txt.includes("descripci")) { colDesc = Number(cell.col); headerRowNumber = rowNumber; }
          if (txt.includes("responsable")) colResp = Number(cell.col);
          if (txt.includes("susp")) colSusp = Number(cell.col);
          if (txt.includes("cal")) colCalDays = Number(cell.col);
          if (txt.includes("fecha")) colDate = Number(cell.col);
          if (txt.includes("bid") || txt.includes("política")) colPolicy = Number(cell.col);
        });
      });

      // --- Step 2: Iterate Rows & Inject Dates ---
      let lastDate = startDate;
      let totalCalendarDays = 0;
      const milestones: any[] = [];

      worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (rowNumber <= headerRowNumber) return;

        const descCell = row.getCell(colDesc);
        const daysCell = row.getCell(colCalDays);

        // Validation Gates
        if (descCell.isMerged || !descCell.text) return;
        
        const calendarDays = parseInt(daysCell.text);
        if (isNaN(calendarDays) || calendarDays < 0) return;

        // Valid Activity Found
        totalCalendarDays += calendarDays;
        const targetDate = calculateTargetDate(lastDate, calendarDays, holidays);

        // Inject Value (Preserving styles)
        const dateCell = row.getCell(colDate);
        dateCell.value = targetDate;
        dateCell.numFmt = "dd/mm/yyyy";

        milestones.push({
          activity: descCell.text,
          responsible: row.getCell(colResp).text,
          days: calendarDays,
          date: targetDate.toISOString()
        });

        lastDate = targetDate;
      });

      // --- Step 3: Post-Processing Summary Block ---
      const workingDaysPerMonth = 22;
      const certificationExtraDays = 25;

      const updateSummaryCell = (searchText: string, value: number) => {
        worksheet.eachRow((row: ExcelJS.Row) => {
          row.eachCell((cell: ExcelJS.Cell) => {
            if (cell.text.toLowerCase().includes(searchText.toLowerCase())) {
              const valCell = row.getCell(cell.col + 1);
              const monthCell = row.getCell(cell.col + 2);
              
              valCell.value = value;
              monthCell.value = parseFloat((value / workingDaysPerMonth).toFixed(2));
            }
          });
        });
      };

      updateSummaryCell("Without Certification", totalCalendarDays);
      updateSummaryCell("With Certification", totalCalendarDays + certificationExtraDays);

      // 5. Build Output
      const outputBuffer = await workbook.xlsx.writeBuffer();
      // Safely convert ExcelJS Buffer (ArrayBuffer-like) to Node.js Buffer
      const processedFileBase64 = Buffer.from(new Uint8Array(outputBuffer as ArrayBuffer)).toString("base64");

      res.status(200).send({
        processedFileBase64,
        milestones,
        referenceCode: `CRONO-${Date.now()}`
      });

    } catch (error: any) {
      console.error("Cloud Function Error:", error);
      res.status(500).send({ error: "Internal Server Error", details: error.message });
    }
  });
});

