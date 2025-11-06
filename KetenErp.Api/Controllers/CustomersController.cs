using KetenErp.Infrastructure.Data;
using KetenErp.Core.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly KetenErpDbContext _db;

        public CustomersController(KetenErpDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _db.Customers.OrderBy(c => c.Name).ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Customer model)
        {
            if (string.IsNullOrWhiteSpace(model.Name)) return BadRequest("Name required");
            if (string.IsNullOrWhiteSpace(model.Email)) model.Email = string.Empty;

            _db.Customers.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = model.Id }, model);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _db.Customers.FindAsync(id);
            if (item == null) return NotFound();
            _db.Customers.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
