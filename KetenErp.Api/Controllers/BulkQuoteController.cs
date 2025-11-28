using KetenErp.Api.Services;
using KetenErp.Core.Service;
using KetenErp.Infrastructure.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Extensions.Configuration;
using System.Linq;
using System.Threading.Tasks;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BulkQuoteController : ControllerBase
    {
    private readonly IServiceRecordRepository _recordRepo;
    private readonly IServiceOperationRepository _opRepo;
    private readonly KetenErp.Core.Repositories.IProductRepository _productRepo;
    private readonly KetenErp.Core.Repositories.ISparePartRepository _spareRepo;
    private readonly KetenErp.Infrastructure.Data.KetenErpDbContext _db;
    private readonly EmailService _emailService;
    private readonly string _frontendUrl;

        public BulkQuoteController(IServiceRecordRepository recordRepo, IServiceOperationRepository opRepo, KetenErp.Core.Repositories.IProductRepository productRepo, KetenErp.Core.Repositories.ISparePartRepository spareRepo, KetenErp.Infrastructure.Data.KetenErpDbContext db, EmailService emailService, IConfiguration configuration)
        {
            _recordRepo = recordRepo;
            _opRepo = opRepo;
            _productRepo = productRepo;
            _spareRepo = spareRepo;
            _db = db;
            _emailService = emailService;
            _frontendUrl = configuration["FrontendUrl"] ?? string.Empty;
        }

        public class BulkQuoteItemDto
        {
            public int Id { get; set; }
            public decimal PartsPrice { get; set; }
            public decimal ServicesPrice { get; set; }
            public string? Email { get; set; }
            public string? Note { get; set; }
        }

        public class BulkQuoteRequest
        {
            public string? RecipientEmail { get; set; }
            // optional array form (frontend may send array)
            public List<string>? RecipientEmails { get; set; }
            public List<string>? RecipientCc { get; set; }
            public List<string>? RecipientBcc { get; set; }
            public string? SenderName { get; set; }

            
            public List<BulkQuoteItemDto> Items { get; set; } = new List<BulkQuoteItemDto>();
        }

        [HttpPost("/api/servicerecords/bulkquote")]
        public async Task<IActionResult> CreateBulkQuote([FromBody] BulkQuoteRequest req)
        {
            if (req == null || req.Items == null || req.Items.Count == 0) return BadRequest("No items provided");

            var exported = new List<string>();
            var exportsDir = Path.Combine(AppContext.BaseDirectory, "exports");
            if (!Directory.Exists(exportsDir)) Directory.CreateDirectory(exportsDir);

            // Toplu teklif: Tüm ürünleri tek bir PDF'te topla
            var tumUrunler = new List<UrunIslem>();
            string musteriAdi = "Müşteri"; // İlk kaydın müşteri adını kullanacağız
            string? belgeNoForPdf = null;

            // preload product and spare part lists for metadata lookups
            var allProducts = (await _productRepo.GetAllAsync()).ToList();
            var allSpareParts = (await _spareRepo.GetAllAsync()).ToList();



            foreach (var it in req.Items)
            {
                try
                {
                    Console.WriteLine($"\n[PDF-DATA] ========== Processing Record ID: {it.Id} ==========");
                    
                    // load record and operations with all related entities
                    var rec = await _recordRepo.GetByIdAsync(it.Id);
                    if (rec == null)
                    {
                        Console.WriteLine($"[PDF-DATA] ERROR: Record {it.Id} not found in repository. Skipping.");
                        continue;
                    }

                    Console.WriteLine($"[PDF-DATA] Record: ServisTakipNo={rec.ServisTakipNo}, FirmaIsmi={rec.FirmaIsmi}, UrunModeli={rec.UrunModeli}");
                    Console.WriteLine($"[PDF-DATA] Record: GrandTotalOverride={rec.GrandTotalOverride}, GrandTotalDiscount={rec.GrandTotalDiscount}%, Currency={rec.Currency}");
                    
                    // Load operations with full navigation properties (ChangedParts and ServiceItems)
                    var ops = await _db.ServiceOperations
                        .Where(o => o.ServiceRecordId == it.Id)
                        .Include(o => o.ChangedParts)
                        .Include(o => o.ServiceItems)
                        .OrderBy(o => o.Id)
                        .ToListAsync();
                    
                    Console.WriteLine($"[PDF-DATA] Loaded {ops.Count} operations for record {it.Id}");

                    // İlk kayıttaki müşteri adını kullan (veya müşteri adı henüz atanmadıysa)
                    if (tumUrunler.Count == 0 && !string.IsNullOrEmpty(rec.FirmaIsmi))
                    {
                        musteriAdi = rec.FirmaIsmi;
                        // also capture BelgeNo from the first record if available
                        if (!string.IsNullOrWhiteSpace(rec.BelgeNo)) belgeNoForPdf = rec.BelgeNo;
                    }

                    var urun = new UrunIslem
                    {
                        UrunAdi = string.IsNullOrEmpty(rec.UrunModeli) ? rec.ServisTakipNo ?? $"#{rec.Id}" : rec.UrunModeli,
                        ServisTakipNo = rec.ServisTakipNo,
                        SKU = null, // SKU is not directly on ServiceRecord, maybe on Product? Leaving null for now.
                        // Fiyat will be computed from operations (considering list price & discount) below
                        Fiyat = 0m,
                        // Map per-record settings
                        UseGrandTotal = rec.GrandTotalOverride.HasValue,
                        DiscountPercent = rec.GrandTotalDiscount ?? 0m,
                        Currency = rec.Currency ?? "USD",
                        Islemler = new List<string>(),
                        // Use record notes if available, otherwise fallback to item note
                        Not = !string.IsNullOrWhiteSpace(rec.Notlar) ? rec.Notlar : it.Note
                    };
                    
                    Console.WriteLine($"[PDF-DATA] UrunIslem created: UrunAdi={urun.UrunAdi}, UseGrandTotal={urun.UseGrandTotal}, DiscountPercent={urun.DiscountPercent}%, Currency={urun.Currency}");
                    
                    // If GrandTotalOverride is set, use it as the base price for this item
                    if (urun.UseGrandTotal)
                    {
                        Console.WriteLine($"[PDF-DATA] *** GRAND TOTAL MODE *** for record {it.Id}");
                        urun.Fiyat = rec.GrandTotalOverride!.Value;
                        Console.WriteLine($"[PDF-DATA] Using GrandTotalOverride: {urun.Fiyat} {urun.Currency}");
                        
                        // In Grand Total mode, we STILL list the parts and services so the customer sees what is being done.
                        // The PDF generator will hide the individual prices because UseGrandTotal is true.
                        // We parse the operations and add them with a dummy price of 0.
                        
                        // Grouping logic to avoid duplicates
                        var groupedParts = new Dictionary<string, decimal>();
                        var groupedServices = new Dictionary<string, decimal>();

                        foreach (var op in ops)
                        {
                            if (op.ChangedParts != null)
                            {
                                foreach (var p in op.ChangedParts)
                                {
                                    var name = p.PartName ?? "Parça";
                                    if (!groupedParts.ContainsKey(name)) groupedParts[name] = 0;
                                    groupedParts[name] += p.Quantity;
                                }
                            }
                            if (op.ServiceItems != null)
                            {
                                foreach (var s in op.ServiceItems)
                                {
                                    var name = s.Name ?? "Hizmet";
                                    if (!groupedServices.ContainsKey(name)) groupedServices[name] = 0;
                                    groupedServices[name] += 1;
                                }
                            }
                        }

                        foreach (var kvp in groupedParts)
                        {
                            urun.Islemler.Add($"Parça: {kvp.Key} x{kvp.Value} : 0");
                        }
                        foreach (var kvp in groupedServices)
                        {
                            if (kvp.Value > 1)
                            {
                                 urun.Islemler.Add($"Hizmet: {kvp.Key} (x{kvp.Value}) : 0");
                            }
                            else
                            {
                                 urun.Islemler.Add($"Hizmet: {kvp.Key} : 0");
                            }
                        }
                        
                        // If no operations found, fallback to product name to avoid empty table
                        if (urun.Islemler.Count == 0)
                        {
                             Console.WriteLine($"[PDF-DATA] No operations found, using fallback item");
                             urun.Islemler.Add($"Hizmet: {urun.UrunAdi} : 0");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"[PDF-DATA] *** DETAILED PRICING MODE *** for record {it.Id}");
                        // Individual Pricing Mode: Calculate total from operations
                        decimal urunTotal = 0m;

                        // Define US culture for consistent formatting (dot decimal)
                        var usCulture = new System.Globalization.CultureInfo("en-US");

                        // Grouping for Individual Mode
                        // Key: (Name, Price, ListPrice, DiscountPercent)
                        var groupedParts = new Dictionary<(string Name, decimal Price, decimal? ListPrice, decimal? Discount), decimal>();
                        var groupedServices = new Dictionary<(string Name, decimal Price, decimal? ListPrice, decimal? Discount), decimal>();

                        foreach (var op in ops)
                        {
                            if (op.ChangedParts != null && op.ChangedParts.Any())
                            {
                                foreach (var p in op.ChangedParts)
                                {
                                    var key = (p.PartName ?? "Parça", p.Price, p.ListPrice, p.DiscountPercent);
                                    if (!groupedParts.ContainsKey(key)) groupedParts[key] = 0;
                                    groupedParts[key] += p.Quantity;
                                }
                            }
                            if (op.ServiceItems != null && op.ServiceItems.Any())
                            {
                                foreach (var s in op.ServiceItems)
                                {
                                    var key = (s.Name ?? "Hizmet", s.Price, s.ListPrice, s.DiscountPercent);
                                    if (!groupedServices.ContainsKey(key)) groupedServices[key] = 0;
                                    groupedServices[key] += 1;
                                }
                            }
                        }
                        
                        // Process Grouped Parts
                        foreach (var kvp in groupedParts)
                        {
                            var (name, price, listPrice, discount) = kvp.Key;
                            var qty = kvp.Value;
                            
                            try 
                            {
                                var basePrice = (listPrice.HasValue && listPrice.Value > 0m) ? listPrice.Value : price;
                                var disc = discount ?? 0m;
                                var discounted = basePrice * (1 - (disc / 100m));
                                var lineTotal = discounted * qty;

                                if (disc > 0m)
                                {
                                    var label = (listPrice.HasValue && listPrice.Value > 0m) ? "Liste" : "Fiyat";
                                    var itemLine = $"Parça: {name} x{qty} : {lineTotal.ToString("C", usCulture)} ({label}: {(basePrice * qty).ToString("C", usCulture)}, İndirim: %{disc})";
                                    urun.Islemler.Add(itemLine);
                                }
                                else
                                {
                                    var itemLine = $"Parça: {name} x{qty} : {lineTotal.ToString("C", usCulture)}";
                                    urun.Islemler.Add(itemLine);
                                }
                                urunTotal += lineTotal;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[PDF-DATA] ERROR processing part {name}: {ex.Message}");
                                 urun.Islemler.Add($"Parça: {name} x{qty} : {(price * qty).ToString("C", usCulture)}");
                                 urunTotal += price * qty;
                            }
                        }

                        // Process Grouped Services
                        foreach (var kvp in groupedServices)
                        {
                            var (name, price, listPrice, discount) = kvp.Key;
                            var qty = kvp.Value;
                            
                            var displayName = qty > 1 ? $"{name} (x{qty})" : name;

                            try
                            {
                                var basePrice = (listPrice.HasValue && listPrice.Value > 0m) ? listPrice.Value : price;
                                var disc = discount ?? 0m;
                                var discounted = basePrice * (1 - (disc / 100m));
                                var lineTotal = discounted * qty;

                                if (disc > 0m)
                                {
                                    var label = (listPrice.HasValue && listPrice.Value > 0m) ? "Liste" : "Fiyat";
                                    var itemLine = $"Hizmet: {displayName} : {lineTotal.ToString("C", usCulture)} ({label}: {(basePrice * qty).ToString("C", usCulture)}, İndirim: %{disc})";
                                    urun.Islemler.Add(itemLine);
                                }
                                else
                                {
                                    var itemLine = $"Hizmet: {displayName} : {lineTotal.ToString("C", usCulture)}";
                                    urun.Islemler.Add(itemLine);
                                }
                                urunTotal += lineTotal;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[PDF-DATA] ERROR processing service {name}: {ex.Message}");
                                var lineTotal = price * qty;
                                urun.Islemler.Add($"Hizmet: {displayName} : {lineTotal.ToString("C", usCulture)}");
                                urunTotal += lineTotal;
                            }
                        }
                        
                        urun.Fiyat = urunTotal;
                    }

                    // Attach photos for this service record (if any) - belge no'ya göre bul
                    try
                    {
                        // Önce belge no'ya göre ara, yoksa ServiceRecordId'ye göre ara
                        var photos = await _db.ServiceRecordPhotos
                            .Where(p => p.ServiceRecordId == it.Id || (!string.IsNullOrWhiteSpace(rec.BelgeNo) && p.BelgeNo == rec.BelgeNo))
                            .OrderByDescending(p => p.CreatedAt)
                            .ToListAsync();
                        
                        foreach (var ph in photos)
                        {
                            try
                            {
                                var candidate = ph.FilePath ?? string.Empty;
                                string? abs = null;
                                try
                                {
                                    if (candidate.StartsWith("wwwroot/", StringComparison.OrdinalIgnoreCase) || candidate.StartsWith("wwwroot\\", StringComparison.OrdinalIgnoreCase))
                                    {
                                        abs = Path.Combine(AppContext.BaseDirectory, candidate);
                                    }
                                    else if (candidate.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) || candidate.StartsWith("uploads\\", StringComparison.OrdinalIgnoreCase))
                                    {
                                        abs = Path.Combine(AppContext.BaseDirectory, "wwwroot", candidate);
                                    }
                                    else
                                    {
                                        // try both forms
                                        var a1 = Path.Combine(AppContext.BaseDirectory, candidate);
                                        var a2 = Path.Combine(AppContext.BaseDirectory, "wwwroot", candidate);
                                        abs = System.IO.File.Exists(a1) ? a1 : (System.IO.File.Exists(a2) ? a2 : a1);
                                    }

                                    if (!string.IsNullOrEmpty(abs) && System.IO.File.Exists(abs))
                                    {
                                        urun.PhotoPaths.Add(abs);
                                    }
                                }
                                catch { /* ignore individual photo path issues */ }
                            }
                            catch { /* ignore individual photo path issues */ }
                        }
                    }
                    catch { /* ignore photo loading errors */ }
                    
                    Console.WriteLine($"[PDF-DATA] Final UrunIslem: Fiyat={urun.Fiyat}, UseGrandTotal={urun.UseGrandTotal}, Islemler.Count={urun.Islemler.Count}");
                    Console.WriteLine($"[PDF-DATA] ========== End Processing Record ID: {it.Id} ==========\n");
                    
                    tumUrunler.Add(urun);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[PDF-DATA] CRITICAL ERROR processing record {it.Id}: {ex}");
                    // Continue to next item instead of failing the whole request
                }
            }

            var publicBaseUrl = !string.IsNullOrWhiteSpace(_frontendUrl) ? _frontendUrl : "";
            
            // Define missing variables for PDF generation
            var servicesFolder = Path.Combine(AppContext.BaseDirectory, "Services");
            var logoPath = Path.Combine(servicesFolder, "logo.png");
            
            // File Naming Logic:
            // If multiple items (Bulk), use "Toplu_Teklif_YYYYMMDD_HHMMSS.pdf"
            // If single item, use "Teklif_BELGENO.pdf" (or timestamp if no belge no)
            string fileName;
            if (tumUrunler.Count > 1)
            {
                fileName = $"Toplu_Teklif_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";
            }
            else
            {
                // User requested timestamp on ALL files
                fileName = $"Teklif_{belgeNoForPdf ?? "NoBelge"}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";
            }
            
            var filePath = Path.Combine(exportsDir, fileName);

            // Currency is now derived from items, so we pass null to let Olustur handle it
            Console.WriteLine($"\n[PDF-GEN] ========== Calling PDF Generator ==========");
            Console.WriteLine($"[PDF-GEN] Customer: {musteriAdi}, Total Items: {tumUrunler.Count}");
            foreach (var u in tumUrunler)
            {
                Console.WriteLine($"[PDF-GEN] Item: {u.UrunAdi}, UseGrandTotal={u.UseGrandTotal}, Fiyat={u.Fiyat}, Currency={u.Currency}");
            }
            
            byte[] pdf = TeklifPdfOlusturucu.Olustur(musteriAdi, tumUrunler, logoPath, null, belgeNoForPdf, req.SenderName, publicBaseUrl, null);
            await System.IO.File.WriteAllBytesAsync(filePath, pdf);
            Console.WriteLine($"[PDF-GEN] PDF saved to: {filePath}");
            exported.Add(filePath);

            // E-mail gönderme işlemi
            bool emailSent = false;
            string emailError = string.Empty;
            
            // Build recipient lists (support either single semi-colon separated string or arrays)
            List<string> toList = new List<string>();
            if (req.RecipientEmails != null && req.RecipientEmails.Any())
            {
                toList.AddRange(req.RecipientEmails.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()));
            }
            else if (!string.IsNullOrEmpty(req.RecipientEmail))
            {
                toList.AddRange(req.RecipientEmail.Split(';').Select(s => s.Trim()).Where(s => s.Length > 0));
            }

            List<string> ccList = new List<string>();
            if (req.RecipientCc != null && req.RecipientCc.Any())
            {
                ccList.AddRange(req.RecipientCc.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()));
            }

            List<string> bccList = new List<string>();
            if (req.RecipientBcc != null && req.RecipientBcc.Any())
            {
                bccList.AddRange(req.RecipientBcc.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()));
            }

            if (toList.Count > 0)
            {
                try
                {
                    Console.WriteLine($"[BulkQuote] Attempting to send email to: {string.Join(';', toList)}");
                    
                    // Aktif e-mail hesabını al
                    var activeEmailAccount = await _db.EmailAccounts
                        .FirstOrDefaultAsync(e => e.IsActive);

                    if (activeEmailAccount != null)
                    {
                        Console.WriteLine($"[BulkQuote] Found active email account: {activeEmailAccount.Name}");
                        
                        string emailSubject = $"Servis Teklifi - {musteriAdi}";
                        string emailBody = $@"
                            <html>
                            <body style='font-family: Arial, sans-serif;'>
                                <h2>Servis Teklifi</h2>
                                <p>Sayın {musteriAdi},</p>
                                <p>Ekteki PDF dosyasında servis hizmetlerimiz için hazırlanmış teklifimizi bulabilirsiniz.</p>
                                <p>Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz.</p>
                                <br/>
                                <p>Saygılarımızla,</p>
                                <p><strong>Keten ERP Teknik Servis</strong></p>
                            </body>
                            </html>
                        ";

                        var result = await _emailService.SendEmailWithAttachmentAsync(
                            activeEmailAccount,
                            toList,
                            ccList,
                            bccList,
                            emailSubject,
                            emailBody,
                            filePath,
                            req.SenderName
                        );

                        emailSent = result.Success;
                        if (!emailSent)
                        {
                            emailError = result.Error;
                            Console.WriteLine($"[BulkQuote] Email send failed: {emailError}");
                        }
                        else
                        {
                            Console.WriteLine($"[BulkQuote] Email sent successfully");
                        }
                    }
                    else
                    {
                        emailError = "Aktif e-mail hesabı bulunamadı. Lütfen ayarlardan bir e-mail hesabı aktif edin.";
                        Console.WriteLine($"[BulkQuote] {emailError}");
                    }
                }
                catch (Exception ex)
                {
                    emailError = $"E-mail gönderilirken hata oluştu: {ex.Message}";
                    Console.WriteLine($"[BulkQuote] Email send exception: {ex}");
                }
            }
            else
            {
                Console.WriteLine($"[BulkQuote] No recipient email provided, skipping email send");
            }

            // Gönderilen teklifi veritabanına kaydet
            try
            {
                var sentQuote = new KetenErp.Core.Service.SentQuote
                {
                    RecipientEmail = req.RecipientEmail ?? "N/A",
                    BelgeNo = belgeNoForPdf ?? "N/A",
                    PdfFileName = fileName,
                    SentAt = DateTime.UtcNow,
                    ServiceRecordIds = string.Join(",", req.Items.Select(i => i.Id)),
                    CustomerName = musteriAdi
                        ,
                        SenderName = req.SenderName
                };
                _db.SentQuotes.Add(sentQuote);
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not save sent quote record: {ex.Message}");
            }

            // Güncelle: Başarılı teklif gönderiminden sonra her kayıt için durumunu 'Onay Bekliyor' yap
            foreach (var it in req.Items)
            {
                try
                {
                    var recordToUpdate = await _recordRepo.GetByIdAsync(it.Id);
                    if (recordToUpdate != null)
                    {
                        recordToUpdate.Durum = KetenErp.Core.Service.ServiceRecordStatus.OnayBekliyor;
                        await _recordRepo.UpdateAsync(recordToUpdate);
                    }
                }
                catch (Exception)
                {
                    // Log veya hata yönetimi burada eklenebilir; şimdilik hata göz ardı ediliyor
                }
            }

            return Ok(new { 
                files = exported, 
                emailSent = emailSent,
                emailError = emailError
            });
        }

        // List sent quotes (for archive view)
        [HttpGet("/api/sentquotes")]
        public async Task<IActionResult> GetSentQuotes()
        {
            try
            {
                var quotes = await _db.SentQuotes
                    .OrderByDescending(q => q.SentAt)
                    .Take(100) // son 100 teklif
                    .ToListAsync();
                return Ok(quotes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // List exported files
        [HttpGet("/api/servicerecords/bulkquote/exports")]
        public IActionResult GetExports()
        {
            var exportsDir = Path.Combine(AppContext.BaseDirectory, "exports");
            if (!Directory.Exists(exportsDir)) return Ok(new { files = new string[0] });
            var files = Directory.GetFiles(exportsDir).Select(Path.GetFileName).ToArray();
            return Ok(new { files });
        }

        // Download a specific exported file by name (URL encoded)
        [HttpGet("/api/servicerecords/bulkquote/exports/{fileName}")]
        public IActionResult GetExportFile(string fileName)
        {
            var exportsDir = Path.Combine(AppContext.BaseDirectory, "exports");
            if (string.IsNullOrEmpty(fileName)) return BadRequest();
            // Prevent path traversal
            if (fileName.IndexOfAny(new[] { '/', '\\' }) >= 0) return BadRequest();
            var filePath = Path.Combine(exportsDir, fileName);
            if (!System.IO.File.Exists(filePath)) return NotFound();
            var contentType = fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "application/pdf" : "text/plain";
            var stream = System.IO.File.OpenRead(filePath);
            // Explicitly set Content-Disposition to inline so browsers open PDF in-tab instead of forcing download.
            // Some browsers/extensions may still choose to download; if so check browser PDF settings.
            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            return File(stream, contentType);
        }
    }
}
