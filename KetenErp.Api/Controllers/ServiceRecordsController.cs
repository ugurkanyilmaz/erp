using KetenErp.Core.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // allow muhasebe role to view records as well
    [Authorize(Roles = "servis,admin,muhasebe")]
    public class ServiceRecordsController : ControllerBase
    {
        private readonly IServiceRecordRepository _repo;

        public ServiceRecordsController(IServiceRecordRepository repo) => _repo = repo;

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var r = await _repo.GetByIdAsync(id);
            if (r == null) return NotFound();
            return Ok(r);
        }

        [HttpPost]
        public async Task<IActionResult> Create(ServiceRecord dto)
        {
            var created = await _repo.AddAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, ServiceRecord dto)
        {
            if (id != dto.Id) return BadRequest();
            var updated = await _repo.UpdateAsync(dto);
            return Ok(updated);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _repo.DeleteAsync(id);
            return NoContent();
        }
    }
}
