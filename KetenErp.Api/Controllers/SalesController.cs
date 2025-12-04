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
    public class SalesController : ControllerBase
    {
        private readonly KetenErpDbContext _context;

        public SalesController(KetenErpDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSales()
        {
            var sales = await _context.Sales
                .OrderByDescending(s => s.Date)
                .ToListAsync();
            return Ok(sales);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSale([FromBody] Sale sale)
        {
            if (sale == null) 
                return BadRequest(new { error = "Sale data is required" });

            // Validate required fields
            if (string.IsNullOrWhiteSpace(sale.CustomerName))
                return BadRequest(new { error = "Customer name is required" });

            if (string.IsNullOrWhiteSpace(sale.SaleNo))
                return BadRequest(new { error = "Sale number is required" });

            if (string.IsNullOrWhiteSpace(sale.SalesPersonId))
                return BadRequest(new { error = "Sales person is required" });

            if (sale.Amount <= 0)
                return BadRequest(new { error = "Amount must be greater than 0" });

            try
            {
                sale.Date = DateTime.UtcNow;
                sale.IsCompleted = false;
                sale.TotalPaidAmount = 0;

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                return Ok(sale);
            }
            catch (Exception ex)
            {
                // Log the error (you can inject ILogger<SalesController> for proper logging)
                return StatusCode(500, new { error = "Failed to create sale", details = ex.Message });
            }
        }

        [HttpPost("{id}/payment")]
        public async Task<IActionResult> AddPayment(int id, [FromBody] decimal amount)
        {
            var sale = await _context.Sales.FindAsync(id);
            if (sale == null) return NotFound();

            sale.TotalPaidAmount += amount;

            if (sale.TotalPaidAmount >= sale.Amount && !sale.IsCompleted)
            {
                sale.IsCompleted = true;
                
                // Calculate Commission
                var commissionAmount = sale.Amount * 0.015m; // 1.5%
                var commission = new CommissionRecord
                {
                    SalesPersonId = sale.SalesPersonId,
                    SaleId = sale.Id,
                    Amount = commissionAmount,
                    Date = DateTime.UtcNow,
                    Month = DateTime.UtcNow.Month,
                    Year = DateTime.UtcNow.Year
                };
                _context.CommissionRecords.Add(commission);
            }

            await _context.SaveChangesAsync();
            return Ok(sale);
        }
        [HttpGet("next-no")]
        public async Task<IActionResult> GetNextSaleNo([FromQuery] string customerName)
        {
            if (string.IsNullOrWhiteSpace(customerName))
                return BadRequest("Customer name is required.");

            // Find the latest sale for this customer to determine the next number
            var lastSale = await _context.Sales
                .Where(s => s.CustomerName == customerName)
                .OrderByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            int nextNumber = 1;
            if (lastSale != null)
            {
                // Try to parse the last number from SaleNo (assuming format like "Firma S1", "Firma S2" or just "1", "2")
                // Simple heuristic: extract digits from the end
                var match = System.Text.RegularExpressions.Regex.Match(lastSale.SaleNo, @"(\d+)$");
                if (match.Success)
                {
                    if (int.TryParse(match.Groups[1].Value, out int lastNum))
                    {
                        nextNumber = lastNum + 1;
                    }
                }
            }

            return Ok(new { NextNumber = nextNumber });
        }
    }
}
