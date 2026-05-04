using CronoApi.Application.DTOs;
using CronoApi.Application.Schedules.Commands;
using CronoApi.Application.Schedules.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CronoApi.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchedulesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SchedulesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromForm] DateTime startDate, [FromForm] IFormFile templateFile)
    {
        if (templateFile == null || templateFile.Length == 0)
            return BadRequest("No file uploaded.");

        using var memoryStream = new MemoryStream();
        await templateFile.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var result = await _mediator.Send(new GenerateScheduleQuery(startDate, memoryStream));
        return Ok(result);
    }

    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] ScheduleResponseDTO schedule)
    {
        var fileBytes = await _mediator.Send(new ExportScheduleCommand(schedule));
        return File(
            fileBytes, 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            $"Schedule_{schedule.ReferenceCode}.xlsx"
        );
    }
}
