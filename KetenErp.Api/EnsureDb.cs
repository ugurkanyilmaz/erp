using System;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Infrastructure.Data;
using KetenErp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace KetenErp.Api
{
    public static class EnsureDb
    {
        public static async Task EnsureAsync(IServiceProvider servicesProvider, IHostEnvironment env)
        {
            using var scope = servicesProvider.CreateScope();
            var services = scope.ServiceProvider;
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
            var db = services.GetRequiredService<KetenErpDbContext>();

            // Try to apply migrations if available
            var migrations = db.Database.GetMigrations();
            if (migrations != null && migrations.Any())
            {
                db.Database.Migrate();
            }
            else
            {
                db.Database.EnsureCreated();
            }

            // Verify schema completeness
            try
            {
                var connCheck = db.Database.GetDbConnection();
                if (connCheck.State != System.Data.ConnectionState.Open)
                    connCheck.Open();

                var expectedTables = new[]
                {
                    "aspnetusers", "aspnetroles", "products", "spareparts", "servicerecords",
                    "serviceoperations", "changedparts", "serviceitems", "servicerecordphotos",
                    "sentquotes", "completedservicerecords", "servicetemplates",
                    "suggestions", "emailaccounts"
                };

                var missing = new System.Collections.Generic.List<string>();
                foreach (var tname in expectedTables)
                {
                    using var cmd = connCheck.CreateCommand();
                    cmd.CommandText = $"SELECT to_regclass('{tname}');";
                    var r = cmd.ExecuteScalar();
                    if (r == DBNull.Value || r == null)
                        missing.Add(tname);
                }

                if (missing.Count > 0)
                {
                    Console.WriteLine($"Missing tables detected: {string.Join(',', missing)}; running EnsureCreated to fix.");
                    db.Database.EnsureCreated();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Schema completeness check failed: {ex.Message}");
            }

            // Ensure Products.MinStock and Products.SKU columns exist
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();

                bool hasMinStock = false;
                bool hasSku = false;

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_name='products';";
                    using var rdr = cmd.ExecuteReader();
                    while (rdr.Read())
                    {
                        var name = rdr.GetString(0);
                        if (name.Equals("minstock", StringComparison.OrdinalIgnoreCase))
                            hasMinStock = true;
                        if (name.Equals("sku", StringComparison.OrdinalIgnoreCase))
                            hasSku = true;
                    }
                }

                if (!hasMinStock)
                {
                    using var alter = conn.CreateCommand();
                    alter.CommandText = "ALTER TABLE products ADD COLUMN minstock INTEGER NOT NULL DEFAULT 0;";
                    alter.ExecuteNonQuery();
                    Console.WriteLine("Added MinStock column to Products table.");
                }

                if (!hasSku)
                {
                    using var alter2 = conn.CreateCommand();
                    alter2.CommandText = "ALTER TABLE products ADD COLUMN sku TEXT;";
                    alter2.ExecuteNonQuery();
                    Console.WriteLine("Added SKU column to Products table.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure MinStock/SKU columns: {ex.Message}");
            }

            // Ensure ServiceRecords.Durum, Notlar, Currency, and GrandTotalOverride
            try
            {
                var conn2 = db.Database.GetDbConnection();
                if (conn2.State != System.Data.ConnectionState.Open)
                    conn2.Open();
                    
                bool hasDurum = false, hasNotlar = false, hasCurrency = false, hasGrandTotalOverride = false, hasGrandTotalDiscount = false;

                using (var cmd = conn2.CreateCommand())
                {
                    cmd.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_name='servicerecords';";
                    using var rdr = cmd.ExecuteReader();
                    while (rdr.Read())
                    {
                        var name = rdr.GetString(0);
                        if (name.Equals("durum", StringComparison.OrdinalIgnoreCase)) hasDurum = true;
                        if (name.Equals("notlar", StringComparison.OrdinalIgnoreCase)) hasNotlar = true;
                        if (name.Equals("currency", StringComparison.OrdinalIgnoreCase)) hasCurrency = true;
                        if (name.Equals("grandtotaloverride", StringComparison.OrdinalIgnoreCase)) hasGrandTotalOverride = true;
                        if (name.Equals("grandtotaldiscount", StringComparison.OrdinalIgnoreCase)) hasGrandTotalDiscount = true;
                    }
                }

                if (!hasDurum)
                {
                    using var alter = conn2.CreateCommand();
                    alter.CommandText = "ALTER TABLE servicerecords ADD COLUMN durum TEXT NOT NULL DEFAULT 'Kayıt Açıldı';";
                    alter.ExecuteNonQuery();
                    Console.WriteLine("Added Durum column to ServiceRecords table.");
                }

                if (!hasNotlar)
                {
                    using var alter2 = conn2.CreateCommand();
                    alter2.CommandText = "ALTER TABLE servicerecords ADD COLUMN notlar TEXT;";
                    alter2.ExecuteNonQuery();
                    Console.WriteLine("Added Notlar column to ServiceRecords table.");
                }

                if (!hasCurrency)
                {
                    using var alter3 = conn2.CreateCommand();
                    alter3.CommandText = "ALTER TABLE servicerecords ADD COLUMN currency TEXT;";
                    alter3.ExecuteNonQuery();
                    Console.WriteLine("Added Currency column to ServiceRecords table.");
                }

                if (!hasGrandTotalOverride)
                {
                    using var alter4 = conn2.CreateCommand();
                    alter4.CommandText = "ALTER TABLE servicerecords ADD COLUMN grandtotaloverride NUMERIC;";
                    alter4.ExecuteNonQuery();
                    Console.WriteLine("Added GrandTotalOverride column to ServiceRecords table.");
                }

                if (!hasGrandTotalDiscount)
                {
                    using var alter5 = conn2.CreateCommand();
                    alter5.CommandText = "ALTER TABLE servicerecords ADD COLUMN grandtotaldiscount NUMERIC;";
                    alter5.ExecuteNonQuery();
                    Console.WriteLine("Added GrandTotalDiscount column to ServiceRecords table.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure ServiceRecords columns: {ex.Message}");
            }

            // Ensure CompletedServiceRecords
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS completedservicerecords (
                        id SERIAL PRIMARY KEY,
                        originalservicerecordid INTEGER,
                        belgeno TEXT,
                        servistakipno TEXT,
                        firmaismi TEXT,
                        urunmodeli TEXT,
                        gelistarihi TEXT,
                        completedat TIMESTAMP WITH TIME ZONE NOT NULL,
                        serializedrecordjson TEXT
                    );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured CompletedServiceRecords table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure CompletedServiceRecords table: {ex.Message}");
            }

            // ServiceTemplates
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS servicetemplates (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        productsku TEXT,
                        changedpartsjson TEXT,
                        serviceitemsjson TEXT,
                        yapankisi TEXT,
                        createdat TIMESTAMP WITH TIME ZONE NOT NULL
                    );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured ServiceTemplates table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure ServiceTemplates: {ex.Message}");
            }

            // SentQuotes.SenderName
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();

                bool hasSenderName = false;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_name='sentquotes';";
                    using var rdr = cmd.ExecuteReader();
                    while (rdr.Read())
                    {
                        if (rdr.GetString(0).Equals("sendername", StringComparison.OrdinalIgnoreCase))
                            hasSenderName = true;
                    }
                }

                if (!hasSenderName)
                {
                    using var alter = conn.CreateCommand();
                    alter.CommandText = "ALTER TABLE sentquotes ADD COLUMN sendername TEXT;";
                    alter.ExecuteNonQuery();
                    Console.WriteLine("Added SenderName column to SentQuotes table.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure SenderName: {ex.Message}");
            }

            // Customers
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS customers (
                        id SERIAL PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT
                    );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured Customers table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure Customers: {ex.Message}");
            }

            // Suggestions
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS suggestions (
                            id SERIAL PRIMARY KEY,
                            key TEXT NOT NULL,
                            value TEXT NOT NULL,
                            sortorder INTEGER,
                            createdat TIMESTAMP WITH TIME ZONE NOT NULL,
                            createdby TEXT
                        );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured Suggestions table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure Suggestions: {ex.Message}");
            }

            // EmailAccounts
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS emailaccounts (
                            id SERIAL PRIMARY KEY,
                            name TEXT NOT NULL,
                            host TEXT NOT NULL,
                            port INTEGER NOT NULL DEFAULT 587,
                            username TEXT,
                            encryptedpassword TEXT,
                            fromaddress TEXT NOT NULL,
                            usetls BOOLEAN NOT NULL DEFAULT TRUE,
                            isactive BOOLEAN NOT NULL DEFAULT FALSE,
                            createdby TEXT,
                            createdat TIMESTAMP WITH TIME ZONE NOT NULL
                        );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured EmailAccounts table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure EmailAccounts: {ex.Message}");
            }

            // RefreshTokens
            try
            {
                var conn = db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    conn.Open();
                    
                using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        CREATE TABLE IF NOT EXISTS refreshtokens (
                            id SERIAL PRIMARY KEY,
                            token TEXT NOT NULL,
                            userid TEXT NOT NULL,
                            expiresat TIMESTAMP WITH TIME ZONE NOT NULL,
                            createdat TIMESTAMP WITH TIME ZONE NOT NULL,
                            revokedat TIMESTAMP WITH TIME ZONE,
                            replacedbytoken TEXT
                        );";
                cmd.ExecuteNonQuery();
                Console.WriteLine("Ensured RefreshTokens table exists.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not ensure RefreshTokens: {ex.Message}");
            }

            // Roles
            string[] roles = { "admin", "servis", "muhasebe", "user" };
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
                        await userManager.AddToRoleAsync(u, role);
                        u.EmailConfirmed = true;
                        u.LockoutEnabled = false;
                        await userManager.UpdateAsync(u);
                    }
                }
            }

            await EnsureUser("ugur", "ugur@havalielaletleritamiri.com", "ugur762.", "admin", "Uğur Yılmaz - Admin");
            await EnsureUser("muhasebe", "muhasebe@havalielaletleritamiri.com", "keten@4145!", "muhasebe", "Muhasebe");
            await EnsureUser("teknik", "teknik@havalielaletleritamiri.com", "servis@1234", "servis", "Teknik Servis");
        }
    }
}
