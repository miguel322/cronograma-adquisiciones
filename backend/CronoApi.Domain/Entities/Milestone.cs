namespace CronoApi.Domain.Entities;

public class Milestone
{
    public int Order { get; set; }
    public string Activity { get; set; } = string.Empty;
    public string Responsible { get; set; } = string.Empty;
    public int SuspensiveDays { get; set; }
    public int CalendarDays { get; set; }
    public DateTime ExpectedDate { get; set; }
    public string BidPolicy { get; set; } = string.Empty;
}
