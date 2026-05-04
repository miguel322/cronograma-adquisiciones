namespace CronoApi.Domain.Services;

public class BusinessDayCalculator
{
    /// <summary>
    /// Calculates the target date by adding <paramref name="daysToAdd"/> business days
    /// (skipping weekends and holidays) to <paramref name="startDate"/>.
    /// Returns <paramref name="startDate"/> immediately when daysToAdd is 0.
    /// </summary>
    public DateTime CalculateTargetDate(DateTime startDate, int daysToAdd, List<DateTime> holidays)
    {
        if (daysToAdd == 0) return startDate;

        DateTime currentDate = startDate;
        int addedDays = 0;

        while (addedDays < daysToAdd)
        {
            currentDate = currentDate.AddDays(1);

            bool isWeekend = currentDate.DayOfWeek == DayOfWeek.Saturday
                          || currentDate.DayOfWeek == DayOfWeek.Sunday;
            bool isHoliday = holidays != null && holidays.Contains(currentDate.Date);

            if (!isWeekend && !isHoliday)
            {
                addedDays++;
            }
        }

        return currentDate;
    }
}
