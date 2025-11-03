using KetenErp.Core.Entities;
using KetenErp.Core.Repositories;
using KetenErp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KetenErp.Infrastructure.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly KetenErpDbContext _db;

        public ProductRepository(KetenErpDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<Product>> GetAllAsync()
        {
            return await _db.Products.ToListAsync();
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            return await _db.Products.FindAsync(id);
        }

        public async Task<Product> AddAsync(Product product)
        {
            _db.Products.Add(product);
            await _db.SaveChangesAsync();
            return product;
        }

        public async Task<Product?> UpdateAsync(Product product)
        {
            var existing = await _db.Products.FindAsync(product.Id);
            if (existing == null) return null;
            existing.Name = product.Name;
            existing.SKU = product.SKU;
            existing.Description = product.Description;
            existing.Stock = product.Stock;
            existing.MinStock = product.MinStock;
            existing.Price = product.Price;
            await _db.SaveChangesAsync();
            return existing;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _db.Products.FindAsync(id);
            if (existing == null) return false;
            _db.Products.Remove(existing);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
