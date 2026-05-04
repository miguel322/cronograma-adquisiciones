using System.Globalization;
using ClosedXML.Excel;
using CronoApi.Application.DTOs;
using CronoApi.Application.Interfaces;


namespace CronoApi.Infrastructure.Services;

public class ExcelService : IExcelService
{
    public byte[] GenerateScheduleExcel(ScheduleResponseDTO schedule, List<DateTime> holidays)
    {
        using var workbook = new XLWorkbook();
        
        // 1. Hoja de Feriados (Oculta)
        var holidaySheet = workbook.Worksheets.Add("Feriados");
        for (int i = 0; i < holidays.Count; i++)
        {
            holidaySheet.Cell(i + 1, 1).Value = holidays[i];
        }
        string holidayRange = $"Feriados!$A$1:$A${Math.Max(1, holidays.Count)}";
        holidaySheet.Hide();

        var worksheet = workbook.Worksheets.Add("Cronograma Oficial");

        // 2. Encabezado Institucional (Filas 1 a 6)
        var titleRange = worksheet.Range("A3:G3");
        titleRange.Merge();
        titleRange.Value = "PROCESO DE COMPRA - CRONOGRAMA OFICIAL";
        titleRange.Style.Font.Bold = true;
        titleRange.Style.Font.FontSize = 14;
        titleRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        titleRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        var refRange = worksheet.Range("B5:F5");
        refRange.Merge();
        refRange.Value = $"Ref: {schedule.ReferenceCode}";
        refRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        refRange.Style.Font.Italic = true;

        var processRange = worksheet.Range("B6:F6");
        processRange.Merge();
        processRange.Value = $"Proceso: {schedule.ProcessName}";
        processRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        processRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        processRange.Style.Alignment.WrapText = true;

        // 3. Encabezados de Tabla (Fila 9)
        string[] headers = { "#", "Descripción de la Actividad", "Responsables", "Días Susp.", "Días Cal.", "Fecha Esperada", "Tiempos (Política BID)" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(9, i + 1).Value = headers[i];
        }

        // 4. Inyección de Datos con Fórmulas (Desde Fila 10)
        int currentRow = 10;
        foreach (var milestone in schedule.Milestones)
        {
            worksheet.Cell(currentRow, 1).Value = milestone.Order;
            worksheet.Cell(currentRow, 2).Value = milestone.Activity;
            worksheet.Cell(currentRow, 3).Value = milestone.Responsible;
            worksheet.Cell(currentRow, 4).Value = milestone.SuspensiveDays;
            worksheet.Cell(currentRow, 5).Value = milestone.CalendarDays;
            
            // Fórmula en Columna F (Fecha Esperada)
            var dateCell = worksheet.Cell(currentRow, 6);
            if (currentRow == 10)
            {
                // Primera fila usa Fecha de Inicio
                string startStr = schedule.StartDate.ToString("yyyy-MM-dd");
                dateCell.FormulaA1 = $"WORKDAY(\"{startStr}\", D{currentRow}+E{currentRow}, {holidayRange})";
            }
            else
            {
                // Filas subsiguientes usan la fecha anterior
                dateCell.FormulaA1 = $"WORKDAY(F{currentRow - 1}, D{currentRow}+E{currentRow}, {holidayRange})";
            }
            dateCell.Style.DateFormat.Format = "dd/MM/yyyy";

            worksheet.Cell(currentRow, 7).Value = milestone.BidPolicy;
            currentRow++;
        }

        int lastRow = currentRow - 1;

        // 5. Convertir a Tabla Nativa de Excel
        var tableRange = worksheet.Range(9, 1, lastRow, 7);
        var table = tableRange.CreateTable("CronogramaOficial");
        table.Theme = XLTableTheme.TableStyleMedium2;
        table.ShowAutoFilter = false;

        // 6. Formato y Anchos de Columna
        worksheet.Column(1).Width = 5;
        worksheet.Column(2).Width = 45;
        worksheet.Column(3).Width = 30;
        worksheet.Column(4).Width = 15;
        worksheet.Column(5).Width = 15;
        worksheet.Column(6).Width = 15;
        worksheet.Column(7).Width = 25;

        // Alineación y Ajuste de Texto
        worksheet.Range(10, 1, lastRow, 7).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        worksheet.Column(2).Style.Alignment.WrapText = true;
        worksheet.Column(3).Style.Alignment.WrapText = true;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public (byte[] FileBytes, List<MilestoneDTO> Milestones) ProcessAndInjectTemplate(
        Stream templateStream,
        DateTime startDate,
        List<DateTime> holidays)
    {
        var calculator = new CronoApi.Domain.Services.BusinessDayCalculator();
        var milestones = new List<MilestoneDTO>();

        templateStream.Position = 0;
        using var workbook = new XLWorkbook(templateStream);
        var worksheet = workbook.Worksheet(1);

        // ── Step 1: Locate header row and resolve column indices dynamically ──────
        // Scans every used row until we find one whose cells contain the expected
        // header keywords. This makes the injector resilient to templates where the
        // header is not always on the same row number.
        int colDesc     = 2; // Column B – fallback
        int colResp     = 3; // Column C – fallback
        int colSusp     = 4; // Column D – fallback
        int colCalDays  = 5; // Column E – fallback
        int colDate     = 6; // Column F – fallback (the one being wrongly overridden)
        int colPolicy   = 7; // Column G – fallback
        int headerRowNumber = -1;

        foreach (var row in worksheet.RowsUsed())
        {
            bool foundHeader = false;
            foreach (var cell in row.CellsUsed())
            {
                string txt = cell.GetString().Trim().ToLowerInvariant();

                if (txt.Contains("descripci"))  { colDesc    = cell.Address.ColumnNumber; foundHeader = true; }
                if (txt.Contains("responsable")) { colResp    = cell.Address.ColumnNumber; }
                if (txt.Contains("susp"))        { colSusp    = cell.Address.ColumnNumber; }
                if (txt.Contains("cal"))         { colCalDays = cell.Address.ColumnNumber; }
                if (txt.Contains("fecha"))       { colDate    = cell.Address.ColumnNumber; }
                if (txt.Contains("bid") || txt.Contains("política")) { colPolicy = cell.Address.ColumnNumber; }
            }
            if (foundHeader)
            {
                headerRowNumber = row.RowNumber();
                break;
            }
        }

        // ── Step 2: Iterate all used rows, skip header and above ─────────────────
        DateTime lastDate = startDate;
        int order = 1;
        int totalCalendarDays = 0; // Accumulated across all valid activity rows

        foreach (var row in worksheet.RowsUsed())
        {
            // Skip the header row and everything above it
            if (headerRowNumber >= 0 && row.RowNumber() <= headerRowNumber)
                continue;

            // ── GATE 1: Description cell must contain non-empty, non-merged text ──
            var descCell = row.Cell(colDesc);

            if (descCell.IsMerged())
                continue;

            string description = descCell.GetString().Trim();
            if (string.IsNullOrEmpty(description))
                continue;

            // ── GATE 2: Calendar-days cell must hold a valid integer ≥ 0 ──────────
            var daysCell = row.Cell(colCalDays);

            if (daysCell.IsEmpty() || daysCell.DataType == XLDataType.Text)
                continue;

            if (!daysCell.TryGetValue<int>(out int calendarDays) || calendarDays < 0)
                continue;

            // ── Both gates passed → real activity row ────────────────────────────

            totalCalendarDays += calendarDays; // Accumulate for summary block

            // Calculate target date (strictly skips weekends + holidays)
            DateTime targetDate = calculator.CalculateTargetDate(lastDate, calendarDays, holidays);

            // Overwrite ONLY the date cell in the column that already exists in the template.
            // Do NOT touch any adjacent column — this prevents the "phantom column G" bug.
            var dateCell = row.Cell(colDate);
            dateCell.Value = targetDate;
            dateCell.Style.DateFormat.Format = "dd/MM/yyyy";

            // Build DTO for the frontend results table
            milestones.Add(new MilestoneDTO
            {
                Order          = order++,
                Activity       = description,
                Responsible    = row.Cell(colResp).GetString().Trim(),
                SuspensiveDays = row.Cell(colSusp).TryGetValue<int>(out int susp) ? susp : 0,
                CalendarDays   = calendarDays,
                ExpectedDate   = targetDate,
                BidPolicy      = row.Cell(colPolicy).GetString().Trim()
            });

            lastDate = targetDate;
        }

        // ── Step 3: Post-processing — update summary block ───────────────────────
        // Uses worksheet.Search() to locate the label cells by their text content.
        // Only the VALUE of the neighbor cells is overwritten; styles (dark background,
        // font color, borders) are left completely intact by ClosedXML's default behavior
        // when you set .Value without touching .Style.

        // Business rule: 22 working days = 1 month
        const double workingDaysPerMonth = 22.0;
        // Business rule: "With Certification" adds 25 extra days to the base total
        const int certificationExtraDays = 25;

        var cellWithoutCert = worksheet
            .Search("Total Days /Without Certification", CompareOptions.OrdinalIgnoreCase)
            .FirstOrDefault();

        if (cellWithoutCert != null)
        {
            // Cell immediately to the right → total days value (dark background)
            cellWithoutCert.CellRight(1).Value = totalCalendarDays;
            // Two cells to the right → months equivalent
            cellWithoutCert.CellRight(2).Value = Math.Round(totalCalendarDays / workingDaysPerMonth, 2);
        }

        var cellWithCert = worksheet
            .Search("Total Days /With Certification", CompareOptions.OrdinalIgnoreCase)
            .FirstOrDefault();

        if (cellWithCert != null)
        {
            int totalWithCert = totalCalendarDays + certificationExtraDays;
            cellWithCert.CellRight(1).Value = totalWithCert;
            cellWithCert.CellRight(2).Value = Math.Round(totalWithCert / workingDaysPerMonth, 2);
        }

        using var outputStream = new MemoryStream();
        workbook.SaveAs(outputStream);
        return (outputStream.ToArray(), milestones);
    }
}

