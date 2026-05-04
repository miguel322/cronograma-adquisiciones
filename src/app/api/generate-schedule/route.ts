import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Firebase Admin SDK — Singleton initialization
// ---------------------------------------------------------------------------
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines from env var
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Business Logic: calculate target date skipping weekends and holidays
// ---------------------------------------------------------------------------
function calculateTargetDate(startDate: Date, daysToAdd: number, holidays: Date[]): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday

    const isHoliday = holidays.some(
      (h) =>
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

// ---------------------------------------------------------------------------
// POST /api/generate-schedule
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authorization — validate Firebase Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    // 2. Parse request body
    const { fileBase64, startDate: startDateStr } = await request.json();
    if (!fileBase64 || !startDateStr) {
      return NextResponse.json({ error: 'Missing required fields: fileBase64, startDate' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const buffer = Buffer.from(fileBase64, 'base64');

    // 3. Fetch holidays from Firestore
    const holidaySnapshot = await db.collection('holidays').get();
    const holidays = holidaySnapshot.docs.map((doc) => new Date(doc.data().date as string));

    // 4. Excel Processing with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    // Step 4a: Detect header row and column positions dynamically
    let colDesc = 2, colResp = 3, colSusp = 4, colCalDays = 5, colDate = 6, colPolicy = 7;
    let headerRowNumber = -1;

    worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (headerRowNumber !== -1) return;
      row.eachCell((cell: ExcelJS.Cell) => {
        const txt = cell.text?.toLowerCase() ?? '';
        // cell.col may be string in some ExcelJS versions — coerce to number
        if (txt.includes('descripci')) { colDesc = Number(cell.col); headerRowNumber = rowNumber; }
        if (txt.includes('responsable')) colResp = Number(cell.col);
        if (txt.includes('susp'))        colSusp = Number(cell.col);
        if (txt.includes('cal'))         colCalDays = Number(cell.col);
        if (txt.includes('fecha'))       colDate = Number(cell.col);
        if (txt.includes('bid') || txt.includes('política')) colPolicy = Number(cell.col);
      });
    });

    // Step 4b: Iterate activity rows and inject calculated dates
    let lastDate = startDate;
    let totalCalendarDays = 0;
    const milestones: Array<{ activity: string; responsible: string; days: number; date: string }> = [];

    worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber <= headerRowNumber) return;

      const descCell = row.getCell(colDesc);
      const daysCell = row.getCell(colCalDays);

      // Skip merged/empty cells and non-numeric day values
      if (descCell.isMerged || !descCell.text) return;
      const calendarDays = parseInt(daysCell.text, 10);
      if (isNaN(calendarDays) || calendarDays < 0) return;

      // Calculate and inject date, preserving existing cell styles
      totalCalendarDays += calendarDays;
      const targetDate = calculateTargetDate(lastDate, calendarDays, holidays);

      const dateCell = row.getCell(colDate);
      dateCell.value = targetDate;
      dateCell.numFmt = 'dd/mm/yyyy';

      milestones.push({
        activity: descCell.text,
        responsible: row.getCell(colResp).text,
        days: calendarDays,
        date: targetDate.toISOString(),
      });

      lastDate = targetDate;
    });

    // Step 4c: Post-process summary/total block
    const WORKING_DAYS_PER_MONTH = 22;
    const CERTIFICATION_EXTRA_DAYS = 25;

    const updateSummaryCell = (searchText: string, value: number) => {
      worksheet.eachRow((row: ExcelJS.Row) => {
        row.eachCell((cell: ExcelJS.Cell) => {
          if (cell.text.toLowerCase().includes(searchText.toLowerCase())) {
            row.getCell(Number(cell.col) + 1).value = value;
            row.getCell(Number(cell.col) + 2).value = parseFloat(
              (value / WORKING_DAYS_PER_MONTH).toFixed(2)
            );
          }
        });
      });
    };

    updateSummaryCell('Without Certification', totalCalendarDays);
    updateSummaryCell('With Certification', totalCalendarDays + CERTIFICATION_EXTRA_DAYS);

    // 5. Serialize workbook to Base64
    const outputBuffer = await workbook.xlsx.writeBuffer();
    const processedFileBase64 = Buffer.from(new Uint8Array(outputBuffer as ArrayBuffer)).toString('base64');

    return NextResponse.json({
      processedFileBase64,
      milestones,
      referenceCode: `CRONO-${Date.now()}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-schedule] Error:', message);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
