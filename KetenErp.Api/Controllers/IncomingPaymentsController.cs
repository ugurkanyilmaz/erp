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
    public class IncomingPaymentsController : ControllerBase
    {
        private readonly KetenErpDbContext _context;

        public IncomingPaymentsController(KetenErpDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetPayments()
        {
            var payments = await _context.IncomingPayments
                .OrderByDescending(p => p.Date)
                .ToListAsync();
            return Ok(payments);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] IncomingPayment payment)
        {
            if (payment == null) return BadRequest();

            payment.Date = DateTime.UtcNow;
            _context.IncomingPayments.Add(payment);

            // If linked to a sale, update the sale's paid amount
            if (payment.SaleId.HasValue)
            {
                var sale = await _context.Sales.FindAsync(payment.SaleId.Value);
                if (sale != null)
                {
                    sale.TotalPaidAmount += payment.Amount;
                    if (sale.TotalPaidAmount >= sale.Amount && !sale.IsCompleted)
                    {
                        sale.IsCompleted = true;
                        
                        // Calculate Commission (logic copied from SalesController)
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
                }
            }

            await _context.SaveChangesAsync();

            return Ok(payment);
        }
    }
}
