using KetenErp.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace KetenErp.Core.Repositories
{
    public interface ISparePartRepository
    {
        Task<IEnumerable<SparePart>> GetAllAsync();
        Task<SparePart?> GetByIdAsync(int id);
        Task<SparePart> AddAsync(SparePart part);
        Task<SparePart?> UpdateAsync(SparePart part);
        Task<bool> DeleteAsync(int id);
    }
}
