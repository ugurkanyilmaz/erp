using Microsoft.AspNetCore.Mvc;
using KetenErp.Core.Service;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/servicetemplates")]
    [Authorize]
    public class ServiceTemplatesController : ControllerBase
    {
        private readonly IServiceTemplateRepository _templateRepo;

        public ServiceTemplatesController(IServiceTemplateRepository templateRepo)
        {
            _templateRepo = templateRepo;
        }

        // GET /api/servicetemplates?productSku=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceTemplate>>> GetTemplates([FromQuery] string? productSku)
        {
            if (string.IsNullOrWhiteSpace(productSku))
            {
                return Ok(await _templateRepo.GetAllAsync());
            }
            return Ok(await _templateRepo.GetByProductSKUAsync(productSku));
        }

        // GET /api/servicetemplates/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceTemplate>> GetTemplate(int id)
        {
            var template = await _templateRepo.GetByIdAsync(id);
            if (template == null) return NotFound();
            return Ok(template);
        }

        // POST /api/servicetemplates
        // Body: { name, productSku, changedParts: [...], serviceItems: [...], yapanKisi }
        [HttpPost]
        public async Task<ActionResult<ServiceTemplate>> CreateTemplate([FromBody] CreateTemplateDto dto)
        {
            Console.WriteLine($"[ServiceTemplates] Received DTO - Name: {dto.Name}, ProductSku: {dto.ProductSku}");
            Console.WriteLine($"[ServiceTemplates] ChangedParts count: {dto.ChangedParts?.Count ?? 0}");
            Console.WriteLine($"[ServiceTemplates] ServiceItems count: {dto.ServiceItems?.Count ?? 0}");
            if (dto.ChangedParts != null)
            {
                foreach (var p in dto.ChangedParts)
                {
                    Console.WriteLine($"  - Part: {p.PartName} x{p.Quantity}");
                }
            }
            if (dto.ServiceItems != null)
            {
                foreach (var s in dto.ServiceItems)
                {
                    Console.WriteLine($"  - Service: {s.Name}");
                }
            }
            
            var template = new ServiceTemplate
            {
                Name = dto.Name ?? "Unnamed Template",
                ProductSKU = dto.ProductSku,
                ChangedPartsJson = dto.ChangedParts != null ? JsonSerializer.Serialize(dto.ChangedParts) : null,
                ServiceItemsJson = dto.ServiceItems != null ? JsonSerializer.Serialize(dto.ServiceItems) : null,
                YapanKisi = dto.YapanKisi,
                CreatedAt = DateTime.UtcNow
            };
            Console.WriteLine($"[ServiceTemplates] Serialized ChangedPartsJson: {template.ChangedPartsJson}");
            Console.WriteLine($"[ServiceTemplates] Serialized ServiceItemsJson: {template.ServiceItemsJson}");
            var created = await _templateRepo.AddAsync(template);
            return CreatedAtAction(nameof(GetTemplate), new { id = created.Id }, created);
        }

        // DELETE /api/servicetemplates/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTemplate(int id)
        {
            var existing = await _templateRepo.GetByIdAsync(id);
            if (existing == null) return NotFound();
            await _templateRepo.DeleteAsync(id);
            return NoContent();
        }
    }

    // DTO for creating a template
    public class CreateTemplateDto
    {
        public string? Name { get; set; }
        public string? ProductSku { get; set; }
        public List<ChangedPartDto>? ChangedParts { get; set; }
        public List<ServiceItemDto>? ServiceItems { get; set; }
        public string? YapanKisi { get; set; }
    }

    public class ChangedPartDto
    {
        public string? PartName { get; set; }
        public int Quantity { get; set; }
    }

    public class ServiceItemDto
    {
        public string? Name { get; set; }
    }
}
