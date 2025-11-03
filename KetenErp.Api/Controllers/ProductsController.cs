using KetenErp.Core.Repositories;
using KetenErp.Core.Entities;
using Microsoft.AspNetCore.Mvc;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _repo;

        public ProductsController(IProductRepository repo)
        {
            _repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var items = await _repo.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var item = await _repo.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        public class ProductCreateDto
        {
            public string? sku { get; set; }
            public string? model { get; set; }
            public string? title { get; set; }
            public int? stock { get; set; }
            public int? minStock { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto payload)
        {
            if (payload == null) return BadRequest();

            var title = payload.title ?? payload.sku ?? payload.model;
            var sku = payload.sku;
            var model = payload.model;
            var stock = payload.stock ?? 0;

            var p = new Product
            {
                SKU = sku,
                Name = title,
                Description = ((model ?? "") + (string.IsNullOrEmpty(sku) ? "" : " | " + sku)).Trim(),
                Stock = stock,
                MinStock = payload.minStock ?? 0,
                Price = 0m
            };

            var created = await _repo.AddAsync(p);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductCreateDto payload)
        {
            if (payload == null) return BadRequest();
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var title = payload.title ?? payload.sku ?? payload.model ?? existing.Name;
            var sku = payload.sku;
            var model = payload.model;
            var stock = payload.stock ?? existing.Stock;

            existing.Name = title;
            existing.SKU = sku;
            existing.Description = ((model ?? "") + (string.IsNullOrEmpty(sku) ? "" : " | " + sku)).Trim();
            existing.Stock = stock;
            existing.MinStock = payload.minStock ?? existing.MinStock;

            var updated = await _repo.UpdateAsync(existing);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        // Support preflight OPTIONS for routes with id (helps browsers send DELETE/PUT requests)
        [HttpOptions("{id}")]
        public IActionResult OptionsForId(int id)
        {
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _repo.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
