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
                if (sale.DueDate.HasValue)
                    sale.DueDate = DateTime.SpecifyKind(sale.DueDate.Value, DateTimeKind.Utc);
                
                sale.IsCompleted = false;
                sale.TotalPaidAmount = 0;

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                return Ok(sale);
            }
            catch (Exception ex)
            {
                // Include inner exception for better debugging
                var details = ex.InnerException != null 
                    ? $"{ex.Message} | Inner: {ex.InnerException.Message}" 
                    : ex.Message;
                return StatusCode(500, new { error = "Failed to create sale", details });
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
                
                // Calculate Commission (Base on Pre-Tax Amount, assuming 20% VAT)
                var preTaxAmount = sale.Amount / 1.20m;
                var commissionAmount = preTaxAmount * 0.015m; // 1.5%
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
        [HttpGet("commissions")]
        public async Task<IActionResult> GetCommissionSummary()
        {
            var commissions = await _context.CommissionRecords
                .GroupBy(c => c.SalesPersonId)
                .Select(g => new
                {
                    SalesPersonId = g.Key,
                    TotalCommission = g.Sum(c => c.Amount),
                    TotalSalesCount = g.Count(),
                    LastCommissionDate = g.Max(c => c.Date)
                })
                .ToListAsync();

            return Ok(commissions);
        }

        [HttpGet("commissions/{salesPersonId}")]
        public async Task<IActionResult> GetCommissionDetails(string salesPersonId)
        {
            var commissions = await _context.CommissionRecords
                .Include(c => c.Sale)
                .Where(c => c.SalesPersonId == salesPersonId)
                .OrderByDescending(c => c.Date)
                .Select(c => new
                {
                    c.Id,
                    c.Date,
                    c.Amount,
                    SaleNo = c.Sale != null ? c.Sale.SaleNo : "-",
                    CustomerName = c.Sale != null ? c.Sale.CustomerName : "-",
                    SaleAmount = c.Sale != null ? c.Sale.Amount : 0
                })
                .ToListAsync();

            return Ok(commissions);
        }
    }
}
