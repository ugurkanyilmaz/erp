using System;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Infrastructure.Data;
using KetenErp.Core.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/settings/emailaccounts")]
    public class EmailAccountsController : ControllerBase
    {
        private readonly KetenErpDbContext _db;

        public EmailAccountsController(KetenErpDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _db.EmailAccounts.OrderByDescending(e => e.IsActive).ThenByDescending(e => e.CreatedAt).ToListAsync();
            return Ok(list);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var acc = await _db.EmailAccounts.FindAsync(id);
            if (acc == null) return NotFound();
            return Ok(acc);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmailAccount model)
        {
            // simple validation
            if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.Host) || string.IsNullOrWhiteSpace(model.FromAddress))
                return BadRequest("Name, Host and From are required.");

            model.CreatedAt = DateTime.UtcNow;
            // If model.IsActive set, clear others
            if (model.IsActive)
            {
                foreach (var a in _db.EmailAccounts) a.IsActive = false;
            }
            _db.EmailAccounts.Add(model);
            await _db.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] EmailAccount model)
        {
            var existing = await _db.EmailAccounts.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = model.Name;
            existing.Host = model.Host;
            existing.Port = model.Port;
            existing.UserName = model.UserName;
            // For password, allow empty to mean leave unchanged
            if (!string.IsNullOrEmpty(model.EncryptedPassword)) existing.EncryptedPassword = model.EncryptedPassword;
            existing.FromAddress = model.FromAddress;
            existing.UseTls = model.UseTls;
            // Handle active flag: if setting active, unset others
            if (model.IsActive && !existing.IsActive)
            {
                foreach (var a in _db.EmailAccounts) a.IsActive = false;
                existing.IsActive = true;
            }
            else if (!model.IsActive)
            {
                existing.IsActive = false;
            }
            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _db.EmailAccounts.FindAsync(id);
            if (existing == null) return NotFound();
            _db.EmailAccounts.Remove(existing);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id:int}/activate")]
        public async Task<IActionResult> Activate(int id)
        {
            var acc = await _db.EmailAccounts.FindAsync(id);
            if (acc == null) return NotFound();
            foreach (var a in _db.EmailAccounts) a.IsActive = false;
            acc.IsActive = true;
            await _db.SaveChangesAsync();
            return Ok(acc);
        }
    }
}
