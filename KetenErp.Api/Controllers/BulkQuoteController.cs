using KetenErp.Api.Services;
using KetenErp.Core.Service;
using KetenErp.Infrastructure.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
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

        public BulkQuoteController(IServiceRecordRepository recordRepo, IServiceOperationRepository opRepo, KetenErp.Core.Repositories.IProductRepository productRepo, KetenErp.Core.Repositories.ISparePartRepository spareRepo, KetenErp.Infrastructure.Data.KetenErpDbContext db, EmailService emailService)
        {
            _recordRepo = recordRepo;
            _opRepo = opRepo;
            _productRepo = productRepo;
            _spareRepo = spareRepo;
            _db = db;
            _emailService = emailService;
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
                // load record and operations with all related entities
                var rec = await _recordRepo.GetByIdAsync(it.Id);
                
                // Load operations with full navigation properties (ChangedParts and ServiceItems)
                var ops = await _db.ServiceOperations
                    .Where(o => o.ServiceRecordId == it.Id)
                    .Include(o => o.ChangedParts)
                    .Include(o => o.ServiceItems)
                    .ToListAsync();

                // İlk kayıttaki müşteri adını kullan
                if (tumUrunler.Count == 0 && !string.IsNullOrEmpty(rec?.FirmaIsmi))
                {
                    musteriAdi = rec.FirmaIsmi;
                    // also capture BelgeNo from the first record if available
                    if (!string.IsNullOrWhiteSpace(rec?.BelgeNo)) belgeNoForPdf = rec.BelgeNo;
                }

                var urun = new UrunIslem
                {
                    UrunAdi = string.IsNullOrEmpty(rec?.UrunModeli) ? rec?.ServisTakipNo ?? $"#{rec?.Id}" : rec.UrunModeli,
                    ServisTakipNo = rec?.ServisTakipNo,
                    // Fiyat will be computed from operations (considering list price & discount) below
                    Fiyat = 0m,
                    Islemler = new List<string>(),
                    // Use record notes if available, otherwise fallback to item note
                    Not = !string.IsNullOrWhiteSpace(rec?.Notlar) ? rec.Notlar : it.Note
                };

                decimal urunTotal = 0m;

                foreach (var op in ops)
                {
                    if (op.ChangedParts != null && op.ChangedParts.Any())
                    {
                        foreach (var p in op.ChangedParts)
                        {
                            // Eğer liste fiyatı ve indirim varsa, indirimli fiyatı hesapla
                            try
                            {
                                decimal list = 0m;
                                decimal disc = 0m;
                                decimal discounted = 0m;
                                decimal qty = p.Quantity;
                                
                                // Use nullable ListPrice/DiscountPercent if provided; otherwise fall back to Price and 0
                                // Check if ListPrice is set and greater than 0
                                if (p.ListPrice.HasValue && p.ListPrice.Value > 0m)
                                {
                                    list = p.ListPrice.Value;
                                    disc = p.DiscountPercent ?? 0m;
                                    discounted = list * (1 - (disc / 100m));
                                    
                                    // Show with discount details if discount applied
                                    if (disc > 0m)
                                    {
                                        urun.Islemler.Add($"Parça: {p.PartName} x{qty} : {(discounted * qty):C} (Liste: {list:C}, İndirim: %{disc})");
                                    }
                                    else
                                    {
                                        urun.Islemler.Add($"Parça: {p.PartName} x{qty} : {(discounted * qty):C}");
                                    }
                                    urunTotal += discounted * qty;
                                }
                                else
                                {
                                    // Fall back to Price if ListPrice not set
                                    urun.Islemler.Add($"Parça: {p.PartName} x{qty} : {(p.Price * qty):C}");
                                    urunTotal += p.Price * qty;
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error processing changed part: {ex.Message}");
                                urun.Islemler.Add($"Parça: {p.PartName} x{p.Quantity} : {(p.Price * p.Quantity):C}");
                                urunTotal += p.Price * p.Quantity;
                            }
                        }
                    }
                    if (op.ServiceItems != null && op.ServiceItems.Any())
                    {
                        foreach (var s in op.ServiceItems)
                        {
                            try
                            {
                                decimal list = 0m;
                                decimal disc = 0m;
                                decimal discounted = 0m;
                                
                                // Check if ListPrice is set and greater than 0
                                if (s.ListPrice.HasValue && s.ListPrice.Value > 0m)
                                {
                                    list = s.ListPrice.Value;
                                    disc = s.DiscountPercent ?? 0m;
                                    discounted = list * (1 - (disc / 100m));
                                    
                                    // Show with discount details if discount applied
                                    if (disc > 0m)
                                    {
                                        urun.Islemler.Add($"Hizmet: {s.Name} : {discounted:C} (Liste: {list:C}, İndirim: %{disc})");
                                    }
                                    else
                                    {
                                        urun.Islemler.Add($"Hizmet: {s.Name} : {discounted:C}");
                                    }
                                    urunTotal += discounted;
                                }
                                else
                                {
                                    // Fall back to Price if ListPrice not set
                                    urun.Islemler.Add($"Hizmet: {s.Name} : {s.Price:C}");
                                    urunTotal += s.Price;
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error processing service item: {ex.Message}");
                                urun.Islemler.Add($"Hizmet: {s.Name} : {s.Price:C}");
                                urunTotal += s.Price;
                            }
                        }
                    }
                }

                // Attach photos for this service record (if any) - belge no'ya göre bul
                try
                {
                    // Önce belge no'ya göre ara, yoksa ServiceRecordId'ye göre ara
                    var photos = await _db.ServiceRecordPhotos
                        .Where(p => p.ServiceRecordId == it.Id || (!string.IsNullOrWhiteSpace(rec!.BelgeNo) && p.BelgeNo == rec.BelgeNo))
                        .OrderByDescending(p => p.CreatedAt)
                        .ToListAsync();
                    
                    foreach (var ph in photos)
                    {
                        try
                        {
                            // FilePath zaten relative path olarak kaydedildi (wwwroot/uploads/BELGENO/filename)
                            // Resolve physical path: stored FilePath may be 'wwwroot/uploads/...' or 'uploads/...'
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
                catch { /* ignore photo lookup errors */ }

                tumUrunler.Add(urun);
                // Set computed price if we accumulated any operation totals, otherwise keep provided parts+services totals
                if (urunTotal > 0m)
                {
                    urun.Fiyat = urunTotal;
                }
                else
                {
                    urun.Fiyat = it.PartsPrice + it.ServicesPrice;
                }
            }

            // Tek bir PDF oluştur - tüm ürünlerle
            var fileName = $"toplu_teklif_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var filePath = Path.Combine(exportsDir, fileName);
            var logoPath = Path.Combine(AppContext.BaseDirectory, "Services", "weblogo.jpg");
            
            // Use public-facing base URL so generated PDFs contain customer-friendly links
            var publicBaseUrl = "http://havalielaletleritamiri.com:8443";
            byte[] pdf = TeklifPdfOlusturucu.Olustur(musteriAdi, tumUrunler, logoPath, null, belgeNoForPdf, req.SenderName, publicBaseUrl);
            await System.IO.File.WriteAllBytesAsync(filePath, pdf);
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
