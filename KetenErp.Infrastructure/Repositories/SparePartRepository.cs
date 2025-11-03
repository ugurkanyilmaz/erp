using KetenErp.Core.Entities;
using KetenErp.Core.Repositories;
using KetenErp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KetenErp.Infrastructure.Repositories
{
    public class SparePartRepository : ISparePartRepository
    {
        private readonly KetenErpDbContext _db;

        public SparePartRepository(KetenErpDbContext db) => _db = db;

        public async Task<SparePart> AddAsync(SparePart part)
        {
            _db.Set<SparePart>().Add(part);
            await _db.SaveChangesAsync();
            return part;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var p = await _db.Set<SparePart>().FindAsync(id);
            if (p == null) return false;
            _db.Set<SparePart>().Remove(p);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<SparePart>> GetAllAsync()
        {
            return await _db.Set<SparePart>().Include(s => s.Product).ToListAsync();
        }

        public async Task<SparePart?> GetByIdAsync(int id)
        {
            return await _db.Set<SparePart>().Include(s => s.Product).FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<SparePart?> UpdateAsync(SparePart part)
        {
            var existing = await _db.Set<SparePart>().FindAsync(part.Id);
            if (existing == null) return null;
            existing.SKU = part.SKU;
            existing.PartNumber = part.PartNumber;
            existing.Title = part.Title;
            existing.ProductId = part.ProductId;
            existing.Stock = part.Stock;
            existing.MinStock = part.MinStock;
            await _db.SaveChangesAsync();
            return existing;
        }
    }
}
