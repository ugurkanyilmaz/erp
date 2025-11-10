using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KetenErp.Infrastructure.Data;

namespace KetenErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly KetenErpDbContext _context;
    private readonly ILogger<HealthController> _logger;

    public HealthController(KetenErpDbContext context, ILogger<HealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Basic health check endpoint
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new 
        { 
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    /// <summary>
    /// Detailed health check including database connectivity
    /// </summary>
    [HttpGet("detailed")]
    public async Task<IActionResult> Detailed()
    {
        var health = new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            checks = new Dictionary<string, object>()
        };

        // Database check
        try
        {
            await _context.Database.CanConnectAsync();
            health.checks["database"] = new { status = "healthy", message = "Connected to PostgreSQL" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");
            health.checks["database"] = new { status = "unhealthy", message = ex.Message };
            return StatusCode(503, health);
        }

        // Memory check
        var process = System.Diagnostics.Process.GetCurrentProcess();
        health.checks["memory"] = new 
        { 
            status = "healthy",
            workingSetMB = Math.Round(process.WorkingSet64 / 1024.0 / 1024.0, 2),
            privateMemoryMB = Math.Round(process.PrivateMemorySize64 / 1024.0 / 1024.0, 2)
        };

        return Ok(health);
    }
}
