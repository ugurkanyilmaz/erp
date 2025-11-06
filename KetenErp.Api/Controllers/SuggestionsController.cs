using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Core.Entities;
using KetenErp.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/settings/suggestions")]
    public class SuggestionsController : ControllerBase
    {
        private readonly KetenErpDbContext _db;
        public SuggestionsController(KetenErpDbContext db)
        {
            _db = db;
        }

        [HttpGet("{key}")]
        public async Task<IActionResult> GetByKey(string key)
        {
            var items = await _db.Suggestions.Where(s => s.Key == key).OrderBy(s => s.SortOrder).ThenBy(s => s.Id).Select(s => new { s.Id, s.Value, s.SortOrder }).ToListAsync();
            return Ok(items);
        }

        public class SuggestionDto { public string Value { get; set; } = string.Empty; public int? SortOrder { get; set; } }

        [HttpPost("{key}")]
        public async Task<IActionResult> Create(string key, [FromBody] SuggestionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Value)) return BadRequest("Value required");
            var ent = new Suggestion { Key = key, Value = dto.Value.Trim(), SortOrder = dto.SortOrder };
            _db.Suggestions.Add(ent);
            await _db.SaveChangesAsync();
            return Ok(new { ent.Id, ent.Value, ent.SortOrder });
        }

        [HttpPut("{key}")]
        public async Task<IActionResult> ReplaceList(string key, [FromBody] List<SuggestionDto> list)
        {
            // Remove existing
            var existing = _db.Suggestions.Where(s => s.Key == key);
            _db.Suggestions.RemoveRange(existing);
            // Add new list (preserve sort by supplied order)
            var entities = list.Select((it, i) => new Suggestion { Key = key, Value = (it.Value ?? string.Empty).Trim(), SortOrder = it.SortOrder ?? i }).ToList();
            if (entities.Count > 0) _db.Suggestions.AddRange(entities);
            await _db.SaveChangesAsync();
            return Ok(entities.Select(e => new { e.Id, e.Value, e.SortOrder }));
        }

        [HttpDelete("{key}/{id}")]
        public async Task<IActionResult> Delete(string key, int id)
        {
            var ent = await _db.Suggestions.FindAsync(id);
            if (ent == null || ent.Key != key) return NotFound();
            _db.Suggestions.Remove(ent);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
