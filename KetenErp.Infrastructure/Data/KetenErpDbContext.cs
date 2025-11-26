using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using KetenErp.Core.Entities;
using KetenErp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace KetenErp.Infrastructure.Data
{
    public class KetenErpDbContext : IdentityDbContext<ApplicationUser>
    {
        public KetenErpDbContext(DbContextOptions<KetenErpDbContext> options) : base(options)
        {
        }

        public override int SaveChanges()
        {
            ConvertDateTimesToUtc();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ConvertDateTimesToUtc();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void ConvertDateTimesToUtc()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                foreach (var property in entry.Properties)
                {
                    var value = property.CurrentValue;
                    
                    // Handle DateTime
                    if (value is DateTime dateTime)
                    {
                        // If the incoming DateTime is Unspecified (common when browsers send
                        // values from <input type="datetime-local">), treat it as LOCAL time
                        // and convert to UTC. Previously Unspecified values were marked as
                        // UTC without conversion which caused stored instants to be wrong.
                        if (dateTime.Kind == DateTimeKind.Unspecified)
                        {
                            property.CurrentValue = DateTime.SpecifyKind(dateTime, DateTimeKind.Local).ToUniversalTime();
                        }
                        else if (dateTime.Kind == DateTimeKind.Local)
                        {
                            property.CurrentValue = dateTime.ToUniversalTime();
                        }
                        else
                        {
                            // DateTimeKind.Utc — keep as-is
                            property.CurrentValue = dateTime;
                        }
                    }
                }
            }
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
    // Refresh tokens for long-lived sessions
    public DbSet<KetenErp.Core.Entities.RefreshToken> RefreshTokens { get; set; } = null!;
    // Email accounts for sending offers
    public DbSet<KetenErp.Core.Entities.EmailAccount> EmailAccounts { get; set; } = null!;
    public DbSet<KetenErp.Core.Entities.SalesDemoRecord> SalesDemoRecords { get; set; } = null!;
        
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

            // Map RefreshToken explicitly
            modelBuilder.Entity<KetenErp.Core.Entities.RefreshToken>(entity =>
            {
                entity.ToTable("RefreshTokens");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Token).IsRequired();
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            modelBuilder.Entity<KetenErp.Core.Entities.SalesDemoRecord>(entity =>
            {
                entity.ToTable("SalesDemoRecords");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SalesPersonId).IsRequired();
                entity.Property(e => e.TargetCompany).IsRequired();
                entity.Property(e => e.TakenDate).IsRequired();
                entity.Property(e => e.Status).IsRequired();
            });

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        // Use Postgres timestamptz (timestamp with time zone) so stored values
                        // represent an absolute instant. This avoids ambiguity when clients
                        // send local datetimes. EF Core will still map to DateTime on CLR
                        // side but the DB column will preserve timezone information.
                        property.SetColumnType("timestamp with time zone");
                    }
                }
            }
        }
    }
}
