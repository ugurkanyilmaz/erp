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
            await _context.SaveChangesAsync();

            return Ok(payment);
        }
    }
}
