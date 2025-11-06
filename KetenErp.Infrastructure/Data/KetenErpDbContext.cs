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
        public DbSet<KetenErp.Core.Entities.Customer> Customers { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceRecord> ServiceRecords { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceOperation> ServiceOperations { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ChangedPart> ChangedParts { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceItem> ServiceItems { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.ServiceRecordPhoto> ServiceRecordPhotos { get; set; } = null!;
    public DbSet<KetenErp.Core.Service.SentQuote> SentQuotes { get; set; } = null!;
    // Archived / completed service records
    public DbSet<KetenErp.Core.Service.CompletedServiceRecord> CompletedServiceRecords { get; set; } = null!;
    // Service templates (for quick operation creation by product SKU)
    public DbSet<KetenErp.Core.Service.ServiceTemplate> ServiceTemplates { get; set; } = null!;
    // Suggestions for settings-driven suggestion lists (e.g. ts_alanKisi, ts_yapanKisi)
    public DbSet<KetenErp.Core.Entities.Suggestion> Suggestions { get; set; } = null!;
    // Email accounts for sending offers
    public DbSet<KetenErp.Core.Entities.EmailAccount> EmailAccounts { get; set; } = null!;
        
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

            modelBuilder.Entity<KetenErp.Core.Service.CompletedServiceRecord>(entity =>
            {
                entity.ToTable("CompletedServiceRecords");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BelgeNo).HasMaxLength(100);
                entity.Property(e => e.ServisTakipNo).HasMaxLength(100);
                entity.Property(e => e.FirmaIsmi).HasMaxLength(200);
                entity.Property(e => e.UrunModeli).HasMaxLength(200);
                // Serialized JSON stored as TEXT
                entity.Property(e => e.SerializedRecordJson).HasColumnType("TEXT");
                entity.Property(e => e.CompletedAt).IsRequired();
            });
        }
    }
}
