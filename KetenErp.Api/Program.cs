using KetenErp.Infrastructure.Data;
using KetenErp.Infrastructure.Identity;
using KetenErp.Infrastructure.Repositories;
using KetenErp.Core.Repositories;
using KetenErp.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using KetenErp.Api;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Response compression for better performance
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// Add HTTP client with retry policy
builder.Services.AddHttpClient();

// CORS - allow the frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "AllowFrontend",
        policy =>
        {
            // Allow both development and production origins
            var allowedOrigins = new[] 
            { 
                "http://localhost:5173",                                    // Vite dev server
                "http://localhost:80",                                      // Docker frontend local
                "http://localhost",                                         // Docker frontend alternative
                // Common host IP used when testing inside Docker on this host
                "http://10.10.10.3:8443",
                "https://havalielaletleritamiri.com",                      // Production domain
                "http://havalielaletleritamiri.com",                     // Production HTTP
                "http://havalielaletleritamiri.com:8443",
                builder.Configuration["FrontendUrl"] ?? "http://localhost"  // .env'den
            };
            
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Configure EF Core to use PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
Console.WriteLine($"Using PostgreSQL connection");
builder.Services.AddDbContext<KetenErpDbContext>(options => 
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        // Connection resilience
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
        npgsqlOptions.CommandTimeout(60);
    });
    
    // Only enable sensitive data logging in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
    }
});

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
builder.Services.AddScoped<KetenErp.Core.Service.IServiceTemplateRepository, KetenErp.Infrastructure.Repositories.ServiceTemplateRepository>();
// register email service
builder.Services.AddScoped<EmailService>();

var app = builder.Build();

// Global exception handling middleware
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        
        var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        if (error != null)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(error.Error, "Unhandled exception occurred");
            
            await context.Response.WriteAsJsonAsync(new 
            { 
                error = "An error occurred processing your request.",
                details = app.Environment.IsDevelopment() ? error.Error.Message : null
            });
        }
    });
});

// Enable response compression
app.UseResponseCompression();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts(); // HTTP Strict Transport Security
}

// Enable CORS early so preflight requests are handled
app.UseCors("AllowFrontend");

// Request logging middleware
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var startTime = DateTime.UtcNow;
    
    try
    {
        await next();
    }
    finally
    {
        var elapsed = DateTime.UtcNow - startTime;
        if (elapsed.TotalMilliseconds > 1000) // Log slow requests
        {
            logger.LogWarning(
                "Slow request: {Method} {Path} took {ElapsedMs}ms - Status {StatusCode}",
                context.Request.Method,
                context.Request.Path,
                elapsed.TotalMilliseconds,
                context.Response.StatusCode);
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

// Serve static files (uploads etc.) from project-level wwwroot (if exists)
app.UseStaticFiles();
// Additionally serve static files from the runtime output wwwroot (AppContext.BaseDirectory/wwwroot)
try
{
    var runtimeWww = Path.Combine(AppContext.BaseDirectory, "wwwroot");
    if (!Directory.Exists(runtimeWww))
    {
        Directory.CreateDirectory(runtimeWww);
    }

    if (Directory.Exists(runtimeWww))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(runtimeWww),
            RequestPath = ""
        });
    }
}
catch (Exception ex)
{
    Console.WriteLine("Could not configure runtime static file provider: " + ex.Message);
}

app.MapControllers();

// Ensure DB schema, seed roles/users and perform any ALTER TABLE / compatibility steps
await EnsureDb.EnsureAsync(app.Services, app.Environment);

app.Run();
