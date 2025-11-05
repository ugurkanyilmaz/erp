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
    public DbSet<KetenErp.Core.Service.ServiceRecordPhoto> ServiceRecordPhotos { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.SentQuote> SentQuotes { get; set; } = null!;
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Explicitly map SentQuote to SentQuotes table and configure columns to avoid
            // any ambiguity with pluralization or defaults. This helps EnsureCreated produce
            // the expected table and columns in SQLite.
            modelBuilder.Entity<KetenErp.Core.Service.SentQuote>(entity =>
            {
                entity.ToTable("SentQuotes");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RecipientEmail).HasMaxLength(256);
                entity.Property(e => e.BelgeNo).HasMaxLength(100);
                entity.Property(e => e.PdfFileName).HasMaxLength(200);
                entity.Property(e => e.CustomerName).HasMaxLength(200);
                entity.Property(e => e.SentAt).IsRequired();
                // ServiceRecordIds stored as comma-separated list; keep as TEXT
                entity.Property(e => e.ServiceRecordIds).HasColumnType("TEXT");
            });
        }
    }
}
