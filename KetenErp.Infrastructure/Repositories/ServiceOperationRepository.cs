using KetenErp.Core.Service;
using KetenErp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace KetenErp.Infrastructure.Repositories
{
    public class ServiceOperationRepository : IServiceOperationRepository
    {
        private readonly KetenErpDbContext _db;

        public ServiceOperationRepository(KetenErpDbContext db) => _db = db;

        public async Task<ServiceOperation> AddAsync(ServiceOperation op)
        {
            // Add operation and then mark parent record as 'İşlemde'
            _db.ServiceOperations.Add(op);
            await _db.SaveChangesAsync();

            // try to update parent record status to indicate there is an ongoing operation
            try
            {
                var record = await _db.ServiceRecords.FindAsync(op.ServiceRecordId);
                if (record != null)
                {
                    // When an operation is added, mark the parent record as awaiting a quote
                    record.Durum = KetenErp.Core.Service.ServiceRecordStatus.TeklifBekliyor;
                    _db.ServiceRecords.Update(record);
                    await _db.SaveChangesAsync();
                }
            }
            catch
            {
                // don't throw - operation was created successfully even if status update fails
            }

            return op;
        }

        public async Task DeleteAsync(int id)
        {
            var o = await _db.ServiceOperations.FindAsync(id);
            if (o != null)
            {
                _db.ServiceOperations.Remove(o);
                await _db.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<ServiceOperation>> GetAllForRecordAsync(int serviceRecordId)
        {
            return await _db.ServiceOperations
                .Where(x => x.ServiceRecordId == serviceRecordId)
                .Include(x => x.ChangedParts)
                .Include(x => x.ServiceItems)
                .ToListAsync();
        }

        public async Task<ServiceOperation?> GetByIdAsync(int id)
        {
            return await _db.ServiceOperations
                .Include(x => x.ChangedParts)
                .Include(x => x.ServiceItems)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<ServiceOperation> UpdateAsync(ServiceOperation op)
        {
            // Load existing operation with all related entities
            var existing = await _db.ServiceOperations
                .Include(x => x.ChangedParts)
                .Include(x => x.ServiceItems)
                .FirstOrDefaultAsync(x => x.Id == op.Id);

            if (existing == null)
            {
                throw new System.InvalidOperationException($"ServiceOperation with ID {op.Id} not found");
            }

            // Update scalar properties
            existing.IslemBitisTarihi = op.IslemBitisTarihi;
            existing.YapanKisi = op.YapanKisi;
            existing.ServiceRecordId = op.ServiceRecordId;

            // Update ChangedParts: remove old ones and add new ones
            if (existing.ChangedParts != null)
            {
                _db.ChangedParts.RemoveRange(existing.ChangedParts);
            }
            if (op.ChangedParts != null && op.ChangedParts.Any())
            {
                foreach (var part in op.ChangedParts)
                {
                    part.ServiceOperationId = existing.Id;
                    part.Id = 0; // Ensure new ID is generated
                    _db.ChangedParts.Add(part);
                }
            }

            // Update ServiceItems: remove old ones and add new ones
            if (existing.ServiceItems != null)
            {
                _db.ServiceItems.RemoveRange(existing.ServiceItems);
            }
            if (op.ServiceItems != null && op.ServiceItems.Any())
            {
                foreach (var item in op.ServiceItems)
                {
                    item.ServiceOperationId = existing.Id;
                    item.Id = 0; // Ensure new ID is generated
                    _db.ServiceItems.Add(item);
                }
            }

            await _db.SaveChangesAsync();
            
            // Reload to return updated entity with new IDs
            return await GetByIdAsync(existing.Id) ?? existing;
        }
    }
}
