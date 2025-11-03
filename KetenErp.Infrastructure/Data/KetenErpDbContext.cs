using KetenErp.Core.Entities;
using KetenErp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Infrastructure.Data
{
    public class KetenErpDbContext : IdentityDbContext<ApplicationUser>
    {
        public KetenErpDbContext(DbContextOptions<KetenErpDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Products { get; set; } = null!;
        public DbSet<KetenErp.Core.Entities.SparePart> SpareParts { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceRecord> ServiceRecords { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceOperation> ServiceOperations { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ChangedPart> ChangedParts { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceItem> ServiceItems { get; set; } = null!;
    }
}
