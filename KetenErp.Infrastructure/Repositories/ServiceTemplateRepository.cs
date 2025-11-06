using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Core.Service;
using KetenErp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Infrastructure.Repositories
{
    public class ServiceTemplateRepository : IServiceTemplateRepository
    {
        private readonly KetenErpDbContext _context;

        public ServiceTemplateRepository(KetenErpDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceTemplate> AddAsync(ServiceTemplate template)
        {
            _context.ServiceTemplates.Add(template);
            await _context.SaveChangesAsync();
            return template;
        }

        public async Task<ServiceTemplate?> GetByIdAsync(int id)
        {
            return await _context.ServiceTemplates.FindAsync(id);
        }

        public async Task<IEnumerable<ServiceTemplate>> GetAllAsync()
        {
            return await _context.ServiceTemplates.ToListAsync();
        }

        public async Task<IEnumerable<ServiceTemplate>> GetByProductSKUAsync(string productSKU)
        {
            return await _context.ServiceTemplates
                .Where(t => t.ProductSKU == productSKU)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var template = await _context.ServiceTemplates.FindAsync(id);
            if (template != null)
            {
                _context.ServiceTemplates.Remove(template);
                await _context.SaveChangesAsync();
            }
        }
    }
}
