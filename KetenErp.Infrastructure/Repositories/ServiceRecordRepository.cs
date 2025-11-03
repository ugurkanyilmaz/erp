using KetenErp.Core.Service;
using KetenErp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KetenErp.Infrastructure.Repositories
{
    public class ServiceRecordRepository : IServiceRecordRepository
    {
        private readonly KetenErpDbContext _db;

        public ServiceRecordRepository(KetenErpDbContext db) => _db = db;

        public async Task<ServiceRecord> AddAsync(ServiceRecord record)
        {
            // ensure initial status persisted
            if (string.IsNullOrWhiteSpace(record.Durum)) record.Durum = KetenErp.Core.Service.ServiceRecordStatus.KayitAcildi;
            _db.ServiceRecords.Add(record);
            await _db.SaveChangesAsync();
            return record;
        }

        public async Task DeleteAsync(int id)
        {
            var r = await _db.ServiceRecords.FindAsync(id);
            if (r != null)
            {
                _db.ServiceRecords.Remove(r);
                await _db.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<ServiceRecord>> GetAllAsync()
        {
            return await _db.ServiceRecords.Include(s => s.Operations).ToListAsync();
        }

        public async Task<ServiceRecord?> GetByIdAsync(int id)
        {
            return await _db.ServiceRecords.Include(s => s.Operations).FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<ServiceRecord> UpdateAsync(ServiceRecord record)
        {
            _db.ServiceRecords.Update(record);
            await _db.SaveChangesAsync();
            return record;
        }
    }
}
