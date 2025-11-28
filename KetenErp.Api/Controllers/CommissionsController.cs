using System;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Core.Entities;
using KetenErp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CommissionsController : ControllerBase
    {
        private readonly KetenErpDbContext _context;

        public CommissionsController(KetenErpDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCommissions([FromQuery] int? month, [FromQuery] int? year)
        {
            var query = _context.CommissionRecords.AsQueryable();

            if (month.HasValue)
                query = query.Where(c => c.Month == month.Value);
            
            if (year.HasValue)
                query = query.Where(c => c.Year == year.Value);

            var commissions = await query
                .Include(c => c.Sale)
                .OrderByDescending(c => c.Date)
                .ToListAsync();

            return Ok(commissions);
        }
    }
}
