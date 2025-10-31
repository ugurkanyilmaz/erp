using KetenErp.Core.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/records/{recordId:int}/[controller]")]
    // allow muhasebe role to update/view operations prices
    [Authorize(Roles = "servis,admin,muhasebe")]
    public class ServiceOperationsController : ControllerBase
    {
        private readonly IServiceOperationRepository _repo;

        public ServiceOperationsController(IServiceOperationRepository repo) => _repo = repo;

        [HttpGet]
        public async Task<IActionResult> GetAll(int recordId) => Ok(await _repo.GetAllForRecordAsync(recordId));

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int recordId, int id)
        {
            var o = await _repo.GetByIdAsync(id);
            if (o == null || o.ServiceRecordId != recordId) return NotFound();
            return Ok(o);
        }

        [HttpPost]
        public async Task<IActionResult> Create(int recordId, ServiceOperation dto)
        {
            dto.ServiceRecordId = recordId;
            var created = await _repo.AddAsync(dto);
            return CreatedAtAction(nameof(Get), new { recordId = recordId, id = created.Id }, created);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int recordId, int id, ServiceOperation dto)
        {
            if (id != dto.Id || dto.ServiceRecordId != recordId) return BadRequest();
            var updated = await _repo.UpdateAsync(dto);
            return Ok(updated);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int recordId, int id)
        {
            var o = await _repo.GetByIdAsync(id);
            if (o == null || o.ServiceRecordId != recordId) return NotFound();
            await _repo.DeleteAsync(id);
            return NoContent();
        }
    }
}
