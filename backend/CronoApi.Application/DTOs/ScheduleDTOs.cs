using CronoApi.Domain.Enums;

namespace CronoApi.Application.DTOs;

public class ScheduleRequestDTO
{
    public ProcessType ProcessType { get; set; }
    public DateTime StartDate { get; set; }
}

public class MilestoneDTO
{
    public int Order { get; set; }
    public string Activity { get; set; } = string.Empty;
    public string Responsible { get; set; } = string.Empty;
    public int SuspensiveDays { get; set; }
    public int CalendarDays { get; set; }
    public DateTime ExpectedDate { get; set; }
    public string BidPolicy { get; set; } = string.Empty;
}

public class ScheduleResponseDTO
{
    public string ReferenceCode { get; set; } = string.Empty;
    public string ProcessName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public List<MilestoneDTO> Milestones { get; set; } = new();
    public byte[]? GeneratedFile { get; set; }
}
