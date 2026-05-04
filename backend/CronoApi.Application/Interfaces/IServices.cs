using CronoApi.Application.DTOs;

namespace CronoApi.Application.Interfaces;

public interface IHolidayService
{
    Task<List<DateTime>> GetHolidaysAsync(int year);
}

public interface IExcelService
{
    byte[] GenerateScheduleExcel(ScheduleResponseDTO schedule, List<DateTime> holidays);
    
    (byte[] FileBytes, List<MilestoneDTO> Milestones) ProcessAndInjectTemplate(
        Stream templateStream, 
        DateTime startDate, 
        List<DateTime> holidays);
}
