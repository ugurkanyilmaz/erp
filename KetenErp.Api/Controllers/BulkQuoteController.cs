using KetenErp.Api.Services;
using KetenErp.Core.Service;
using KetenErp.Infrastructure.Repositories;
using Microsoft.AspNetCore.Mvc;
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

        public BulkQuoteController(IServiceRecordRepository recordRepo, IServiceOperationRepository opRepo)
        {
            _recordRepo = recordRepo;
            _opRepo = opRepo;
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

            foreach (var it in req.Items)
            {
                // load record and operations
                var rec = await _recordRepo.GetByIdAsync(it.Id);
                var ops = await _opRepo.GetAllForRecordAsync(it.Id);

                // İlk kayıttaki müşteri adını kullan
                if (tumUrunler.Count == 0 && !string.IsNullOrEmpty(rec?.FirmaIsmi))
                {
                    musteriAdi = rec.FirmaIsmi;
                }

                var urun = new UrunIslem
                {
                    UrunAdi = string.IsNullOrEmpty(rec?.UrunModeli) ? rec?.SeriNo ?? $"#{rec?.Id}" : rec.UrunModeli,
                    SeriNo = rec?.SeriNo,
                    Fiyat = it.PartsPrice + it.ServicesPrice,
                    Islemler = new List<string>(),
                    Not = it.Note
                };

                foreach (var op in ops)
                {
                    if (op.ChangedParts != null)
                    {
                        foreach (var p in op.ChangedParts)
                        {
                            urun.Islemler.Add($"Parça: {p.PartName} x{p.Quantity} : {p.Price:C}");
                        }
                    }
                    if (op.ServiceItems != null)
                    {
                        foreach (var s in op.ServiceItems)
                        {
                            urun.Islemler.Add($"Hizmet: {s.Name} : {s.Price:C}");
                        }
                    }
                }

                tumUrunler.Add(urun);
            }

            // Tek bir PDF oluştur - tüm ürünlerle
            var fileName = $"toplu_teklif_{DateTime.Now:yyyyMMddHHmmss}.pdf";
            var filePath = Path.Combine(exportsDir, fileName);
            var logoPath = Path.Combine(AppContext.BaseDirectory, "Services", "weblogo.jpg");
            
            byte[] pdf = TeklifPdfOlusturucu.Olustur(musteriAdi, tumUrunler, logoPath);
            await System.IO.File.WriteAllBytesAsync(filePath, pdf);
            exported.Add(filePath);

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

            return Ok(new { files = exported });
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
            return File(stream, contentType, fileName);
        }
    }
}
