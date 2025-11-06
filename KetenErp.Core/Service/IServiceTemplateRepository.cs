using System.Collections.Generic;
using System.Threading.Tasks;

namespace KetenErp.Core.Service
{
    public interface IServiceTemplateRepository
    {
        Task<ServiceTemplate> AddAsync(ServiceTemplate template);
        Task<ServiceTemplate?> GetByIdAsync(int id);
        Task<IEnumerable<ServiceTemplate>> GetAllAsync();
        Task<IEnumerable<ServiceTemplate>> GetByProductSKUAsync(string productSKU);
        Task DeleteAsync(int id);
    }
}
