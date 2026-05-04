using CronoApi.Application.DTOs;
using CronoApi.Application.Interfaces;
using MediatR;

namespace CronoApi.Application.Schedules.Commands;

public record ExportScheduleCommand(ScheduleResponseDTO Schedule) : IRequest<byte[]>;

public class ExportScheduleCommandHandler : IRequestHandler<ExportScheduleCommand, byte[]>
{
    private readonly IExcelService _excelService;
    private readonly IHolidayService _holidayService;

    public ExportScheduleCommandHandler(IExcelService excelService, IHolidayService holidayService)
    {
        _excelService = excelService;
        _holidayService = holidayService;
    }

    public async Task<byte[]> Handle(ExportScheduleCommand command, CancellationToken cancellationToken)
    {
        var holidays = await _holidayService.GetHolidaysAsync(command.Schedule.StartDate.Year);
        var excelBytes = _excelService.GenerateScheduleExcel(command.Schedule, holidays);
        return excelBytes;
    }
}
