using KetenErp.Core.Entities;
using KetenErp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "satis,admin,muhasebe")]
    public class SalesDemoController : ControllerBase
    {
        private readonly KetenErpDbContext _db;

        public SalesDemoController(KetenErpDbContext db)
        {
            _db = db;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            var items = await _db.SalesDemoRecords
                .Include(r => r.Product)
                .Where(r => r.Status == "Active")
                .OrderByDescending(r => r.TakenDate)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var items = await _db.SalesDemoRecords
                .Include(r => r.Product)
                .Where(r => r.Status != "Active")
                .OrderByDescending(r => r.ReturnDate)
                .ThenByDescending(r => r.TakenDate)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("take")]
        public async Task<IActionResult> TakeProduct([FromBody] SalesDemoRecordDto dto)
        {
            if (dto == null) return BadRequest();

            // Always force SalesPersonId to be the current user's username
            var salesPersonId = User.Identity?.Name;

            if (string.IsNullOrEmpty(salesPersonId)) return BadRequest("SalesPersonId is required");

            var record = new SalesDemoRecord
            {
                ProductId = dto.ProductId,
                SalesPersonId = salesPersonId,
                TargetCompany = dto.TargetCompany,
                TakenDate = DateTime.UtcNow,
                Status = "Active",
                Notes = dto.Notes
            };

            _db.SalesDemoRecords.Add(record);
            await _db.SaveChangesAsync();

            return Ok(record);
        }

        [HttpPost("return/{id}")]
        public async Task<IActionResult> ReturnProduct(int id)
        {
            var record = await _db.SalesDemoRecords.FindAsync(id);
            if (record == null) return NotFound();

            record.Status = "Returned";
            record.ReturnDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(record);
        }

        [HttpPost("sell/{id}")]
        public async Task<IActionResult> SellProduct(int id)
        {
            var record = await _db.SalesDemoRecords.FindAsync(id);
            if (record == null) return NotFound();

            record.Status = "Sold";
            record.ReturnDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(record);
        }
        
        public class SalesDemoRecordDto
        {
            public int ProductId { get; set; }
            public string? SalesPersonId { get; set; }
            public string TargetCompany { get; set; } = string.Empty;
            public string? Notes { get; set; }
        }
    }
}
