using KetenErp.Infrastructure.Data;
using KetenErp.Infrastructure.Identity;
using KetenErp.Infrastructure.Repositories;
using KetenErp.Core.Repositories;
using KetenErp.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS - allow the frontend dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Configure EF Core to use SQLite (file-based DB)
var defaultDbPath = Path.Combine(AppContext.BaseDirectory, "..", "ketenerp.db");
var sqliteDefault = $"Data Source={Path.GetFullPath(defaultDbPath)}";
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? sqliteDefault;
builder.Services.AddDbContext<KetenErpDbContext>(options => options.UseSqlite(connectionString));

// DI
builder.Services.AddScoped<IProductRepository, ProductRepository>();
// register spare part repository
builder.Services.AddScoped<KetenErp.Core.Repositories.ISparePartRepository, KetenErp.Infrastructure.Repositories.SparePartRepository>();

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
    .AddEntityFrameworkStores<KetenErpDbContext>()
    .AddDefaultTokenProviders();

// JWT
builder.Services.AddScoped<TokenService>();
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? "please-change-this-secret";
var jwtIssuer = jwtSection["Issuer"] ?? "KetenErp";
var jwtAudience = jwtSection["Audience"] ?? "KetenErpUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Configure controllers and JSON options to avoid object cycle serialization errors
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Prevent possible reference cycles between entities when serializing EF navigation properties
        opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Optional: don't emit null properties
        opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
// register service repositories
builder.Services.AddScoped<KetenErp.Core.Service.IServiceRecordRepository, KetenErp.Infrastructure.Repositories.ServiceRecordRepository>();
builder.Services.AddScoped<KetenErp.Core.Service.IServiceOperationRepository, KetenErp.Infrastructure.Repositories.ServiceOperationRepository>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
    // Do not force HTTPS redirection in development to avoid https-port redirect warnings
}
else
{
    app.UseHttpsRedirection();
}

// Enable CORS early so preflight requests are handled
app.UseCors("AllowFrontend");

// Simple request logging to help debug incoming requests (method/path and Authorization header presence)
app.Use(async (context, next) =>
{
    try
    {
        var hasAuth = context.Request.Headers.ContainsKey("Authorization");
        Console.WriteLine($"[{DateTime.Now:O}] Incoming: {context.Request.Method} {context.Request.Path} AuthHeader={(hasAuth ? "yes" : "no")}");
    }
    catch { }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed roles and example users
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var db = services.GetRequiredService<KetenErpDbContext>();
    // Try to apply migrations if available, otherwise fall back to EnsureCreated.
    // If the project contains EF migrations, apply them. If not, fall back to EnsureCreated
    // so local SQLite gets the required tables for Identity and app entities.
    var migrations = db.Database.GetMigrations();
    if (migrations != null && migrations.Any())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }

    // If the database file existed previously but is missing Identity tables (partial DB),
    // EnsureCreated won't add missing tables. Do a quick probe and recreate DB if necessary
    // to ensure Identity tables are present for development environments.
    var needsRecreate = false;
    try
    {
        // Try reading from the Roles set; this will throw if the table doesn't exist
        await db.Roles.AnyAsync();
    }
    catch
    {
        needsRecreate = true;
    }

    if (needsRecreate)
    {
        Console.WriteLine("Recreating database because required Identity tables were missing.");
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
    }

    // Ensure Products table has MinStock column (added later) - SQLite supports ALTER TABLE ADD COLUMN.
    try
    {
        using var conn = db.Database.GetDbConnection();
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA table_info('Products');";
        using var rdr = cmd.ExecuteReader();
        var found = false;
        while (rdr.Read())
        {
            var name = rdr[1]?.ToString();
            if (string.Equals(name, "MinStock", StringComparison.OrdinalIgnoreCase))
            {
                found = true;
                break;
            }
        }
        rdr.Close();
        if (!found)
        {
            using var alter = conn.CreateCommand();
            alter.CommandText = "ALTER TABLE Products ADD COLUMN MinStock INTEGER NOT NULL DEFAULT 0;";
            alter.ExecuteNonQuery();
            Console.WriteLine("Added MinStock column to Products table.");
        }
            // Ensure Products table has SKU column (optional text)
            try
            {
                using var cmd2 = conn.CreateCommand();
                cmd2.CommandText = "PRAGMA table_info('Products');";
                using var rdr2 = cmd2.ExecuteReader();
                var hasSku = false;
                while (rdr2.Read())
                {
                    var name = rdr2[1]?.ToString();
                    if (string.Equals(name, "SKU", StringComparison.OrdinalIgnoreCase))
                    {
                        hasSku = true;
                        break;
                    }
                }
                rdr2.Close();
                if (!hasSku)
                {
                    using var alter2 = conn.CreateCommand();
                    alter2.CommandText = "ALTER TABLE Products ADD COLUMN SKU TEXT;";
                    alter2.ExecuteNonQuery();
                    Console.WriteLine("Added SKU column to Products table.");
                    // Try to backfill SKU from Description when it was stored there as '... | SKU'
                    try
                    {
                        using var backfill = conn.CreateCommand();
                        backfill.CommandText = "UPDATE Products SET SKU = substr(Description, instr(Description, ' | ')+3) WHERE (SKU IS NULL OR SKU = '') AND Description LIKE '% | %';";
                        var updated = backfill.ExecuteNonQuery();
                        if (updated > 0) Console.WriteLine($"Backfilled SKU for {updated} products from Description.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Could not backfill SKU values: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure SKU column exists: {ex.Message}");
            }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Could not ensure MinStock column exists: {ex.Message}");
    }

    // Ensure ServiceRecords table has Durum column (status) - add column and backfill existing rows if needed
    try
    {
        using var conn2 = db.Database.GetDbConnection();
        conn2.Open();
        using var cmdSr = conn2.CreateCommand();
        cmdSr.CommandText = "PRAGMA table_info('ServiceRecords');";
        using var rdrSr = cmdSr.ExecuteReader();
        var foundDurum = false;
        while (rdrSr.Read())
        {
            var name = rdrSr[1]?.ToString();
            if (string.Equals(name, "Durum", StringComparison.OrdinalIgnoreCase))
            {
                foundDurum = true;
                break;
            }
        }
        rdrSr.Close();
        if (!foundDurum)
        {
            using var alterSr = conn2.CreateCommand();
            // Add the Durum column with a default and not-null to ensure existing rows get a value
            alterSr.CommandText = "ALTER TABLE ServiceRecords ADD COLUMN Durum TEXT NOT NULL DEFAULT 'Kayıt Açıldı';";
            alterSr.ExecuteNonQuery();
            Console.WriteLine("Added Durum column to ServiceRecords table.");
            try
            {
                using var backfillSr = conn2.CreateCommand();
                backfillSr.CommandText = "UPDATE ServiceRecords SET Durum = 'Kayıt Açıldı' WHERE Durum IS NULL OR Durum = '';";
                var updated = backfillSr.ExecuteNonQuery();
                if (updated > 0) Console.WriteLine($"Backfilled Durum for {updated} service records.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not backfill Durum values: {ex.Message}");
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Could not ensure Durum column exists: {ex.Message}");
    }

    string[] roles = new[] { "admin", "servis", "muhasebe", "user" };
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    async Task EnsureUser(string userName, string email, string pwd, string role, string? fullName = null)
    {
        var existing = await userManager.FindByNameAsync(userName);
        if (existing == null)
        {
            var u = new ApplicationUser
            {
                UserName = userName,
                Email = email,
                FullName = fullName,
                LockoutEnabled = false
            };
            var res = await userManager.CreateAsync(u, pwd);
            if (res.Succeeded)
            {
                // Make sure email is confirmed and user is added to role
                await userManager.AddToRoleAsync(u, role);
                u.EmailConfirmed = true;
                u.LockoutEnabled = false;
                await userManager.UpdateAsync(u);
            }
        }
    }

    await EnsureUser("admin", "admin@keten.local", "admin123", "admin", "System Administrator");
    await EnsureUser("servis", "servis@keten.local", "Servis123!", "servis", "Servis User");
    await EnsureUser("muhasebe", "muhasebe@keten.local", "Muhasebe123!", "muhasebe", "Muhasebe User");
    await EnsureUser("user", "user@keten.local", "User123!", "user", "Normal User");
}

app.Run();
