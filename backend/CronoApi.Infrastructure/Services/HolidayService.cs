using CronoApi.Application.Interfaces;

namespace CronoApi.Infrastructure.Services;

public class HolidayService : IHolidayService
{
    public Task<List<DateTime>> GetHolidaysAsync(int year)
    {
        // Mocked Dominican Holidays for the year
        var holidays = new List<DateTime>
        {
            new(year, 1, 1),   // New Year's Day
            new(year, 1, 6),   // Epiphany
            new(year, 1, 21),  // Our Lady of Altagracia
            new(year, 1, 26),  // Duarte's Day
            new(year, 2, 27),  // Independence Day
            new(year, 8, 16),  // Restoration Day
            new(year, 9, 24),  // Our Lady of Mercy
            new(year, 11, 6),  // Constitution Day
            new(year, 12, 25)  // Christmas Day
        };

        return Task.FromResult(holidays);
    }
}
