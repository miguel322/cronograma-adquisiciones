using ClosedXML.Excel;
using CronoApi.Application.DTOs;
using CronoApi.Application.Interfaces;
using CronoApi.Domain.Services;
using MediatR;

namespace CronoApi.Application.Schedules.Queries;

public record GenerateScheduleQuery(DateTime StartDate, MemoryStream TemplateStream) : IRequest<ScheduleResponseDTO>;

public class GenerateScheduleQueryHandler : IRequestHandler<GenerateScheduleQuery, ScheduleResponseDTO>
{
    private readonly IHolidayService _holidayService;
    private readonly IExcelService _excelService;

    public GenerateScheduleQueryHandler(IHolidayService holidayService, IExcelService excelService)
    {
        _holidayService = holidayService;
        _excelService = excelService;
    }

    public async Task<ScheduleResponseDTO> Handle(GenerateScheduleQuery query, CancellationToken cancellationToken)
    {
        var holidays = await _holidayService.GetHolidaysAsync(query.StartDate.Year);
        
        // Delegamos el procesamiento y la inyección al servicio especializado
        var (fileBytes, milestones) = _excelService.ProcessAndInjectTemplate(
            query.TemplateStream, 
            query.StartDate, 
            holidays);

        return new ScheduleResponseDTO
        {
            ReferenceCode = $"CRONO-{DateTime.Now:yyyyMMddHHmm}",
            ProcessName = "Cronograma Generado (Plantilla Original)",
            StartDate = query.StartDate,
            Milestones = milestones,
            GeneratedFile = fileBytes
        };
    }
}
