using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using KetenErp.Core.Entities;
using KetenErp.Core.Service;
using KetenErp.Infrastructure.Data;
using KetenErp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    public class CreateProductQuoteDto
    {
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string Currency { get; set; } = "TRY";
        public string PaymentTerm { get; set; } = "Peşin";
        public string? Notes { get; set; }
        public List<ProductQuoteItemDto> Items { get; set; } = new List<ProductQuoteItemDto>();
    }

    public class ProductQuoteItemDto
    {
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; } = 0;
    }

    public class SendProductQuoteDto
    {
        public string RecipientEmail { get; set; } = string.Empty;
        public List<string>? Cc { get; set; }
        public string? SenderName { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductQuotesController : ControllerBase
    {
        private readonly KetenErpDbContext _context;
        private readonly EmailService _emailService;

        public ProductQuotesController(KetenErpDbContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProductQuotes()
        {
            var quotes = await _context.ProductQuotes
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .Include(q => q.Sale)
                .OrderByDescending(q => q.CreatedDate)
                .ToListAsync();

            return Ok(quotes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProductQuote(int id)
        {
            var quote = await _context.ProductQuotes
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .Include(q => q.Sale)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return NotFound();

            return Ok(quote);
        }

        [HttpPost]
        public async Task<IActionResult> CreateProductQuote([FromBody] CreateProductQuoteDto dto)
        {
            if (dto == null || dto.Items == null || dto.Items.Count == 0)
                return BadRequest("Teklif en az bir ürün içermelidir.");

            // Generate quote number
            var quoteNo = await GenerateQuoteNumber();

            var quote = new ProductQuote
            {
                CustomerName = dto.CustomerName,
                CustomerEmail = dto.CustomerEmail,
                QuoteNo = quoteNo,
                CreatedDate = DateTime.UtcNow,
                Currency = dto.Currency,
                PaymentTerm = dto.PaymentTerm,
                Notes = dto.Notes,
                Status = "Taslak"
            };

            foreach (var itemDto in dto.Items)
            {
                quote.Items.Add(new ProductQuoteItem
                {
                    ProductId = itemDto.ProductId,
                    ProductName = itemDto.ProductName,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemDto.UnitPrice,
                    DiscountPercent = itemDto.DiscountPercent
                });
            }

            _context.ProductQuotes.Add(quote);
            await _context.SaveChangesAsync();

            // Reload with includes
            var created = await _context.ProductQuotes
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(q => q.Id == quote.Id);

            return Ok(created);
        }

        [HttpPost("{id}/send")]
        public async Task<IActionResult> SendProductQuote(int id, [FromBody] SendProductQuoteDto dto)
        {
            var quote = await _context.ProductQuotes
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return NotFound();

            if (quote.Status != "Taslak" && quote.Status != "Gönderildi")
                return BadRequest("Sadece 'Taslak' veya 'Gönderildi' durumundaki teklifler gönderilebilir.");

            try
            {
                // Generate PDF
                var pdfItems = quote.Items.Select(item => new UrunSatisPdfOlusturucu.ProductQuoteItemDto
                {
                    ProductName = item.ProductName,
                    SKU = item.Product?.SKU,
                    Quantity = item.Quantity,
                    ListPrice = item.UnitPrice,
                    DiscountPercent = item.DiscountPercent
                }).ToList();

                var pdfBytes = UrunSatisPdfOlusturucu.Olustur(
                    customerName: quote.CustomerName,
                    quoteNo: quote.QuoteNo,
                    items: pdfItems,
                    currency: quote.Currency,
                    notes: quote.Notes,
                    senderName: dto.SenderName
                );

                // Save PDF to wwwroot/uploads
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                Directory.CreateDirectory(uploadsFolder);

                var pdfFileName = $"Product_Quote_{quote.QuoteNo}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";
                var pdfFilePath = Path.Combine(uploadsFolder, pdfFileName);

                await System.IO.File.WriteAllBytesAsync(pdfFilePath, pdfBytes);

                // Create SentQuote record for archive
                var sentQuote = new SentQuote
                {
                    RecipientEmail = dto.RecipientEmail,
                    BelgeNo = quote.QuoteNo,
                    PdfFileName = pdfFileName,
                    SentAt = DateTime.UtcNow,
                    CustomerName = quote.CustomerName,
                    SenderName = dto.SenderName,
                    QuoteType = "Product",
                    ProductQuoteId = quote.Id
                };

                _context.SentQuotes.Add(sentQuote);

                // Update quote status
                quote.Status = "Gönderildi";
                quote.SentDate = DateTime.UtcNow;
                quote.SentQuoteId = sentQuote.Id;

                await _context.SaveChangesAsync();

                // Try to send email
                bool emailSent = false;
                string? emailError = null;

                try
                {
                    // Get default email account (using IsActive as proxy for default since IsDefault doesn't exist)
                    var emailAccount = await _context.EmailAccounts.FirstOrDefaultAsync(e => e.IsActive);
                    if (emailAccount == null)
                    {
                        // Fallback to first account if no default
                        emailAccount = await _context.EmailAccounts.FirstOrDefaultAsync();
                    }

                    if (emailAccount != null)
                    {
                        var emailResult = await _emailService.SendEmailWithAttachmentAsync(
                            account: emailAccount,
                            toEmails: new[] { dto.RecipientEmail },
                            ccEmails: dto.Cc,
                            bccEmails: null,
                            subject: $"Ürün Fiyat Teklifi - {quote.QuoteNo}",
                            body: $"Sayın {quote.CustomerName},\n\nÜrün fiyat teklifimiz ekte sunulmuştur.\n\nSaygılarımızla,\n{dto.SenderName ?? "Keten Pnömatik"}",
                            attachmentPath: pdfFilePath,
                            senderName: dto.SenderName
                        );

                        emailSent = emailResult.Success;
                        emailError = emailResult.Error;
                    }
                    else
                    {
                        emailError = "Sistemde kayıtlı e-posta hesabı bulunamadı.";
                        Console.WriteLine("Email sending failed: No email account found.");
                    }
                }
                catch (Exception emailEx)
                {
                    emailError = emailEx.Message;
                    Console.WriteLine($"Email sending failed: {emailEx.Message}");
                }

                return Ok(new
                {
                    success = true,
                    emailSent,
                    emailError,
                    quote,
                    pdfFileName
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending product quote: {ex.Message}");
                return StatusCode(500, new { message = "Teklif gönderilemedi.", error = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveProductQuote(int id)
        {
            var quote = await _context.ProductQuotes
                .Include(q => q.Items)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
                return NotFound();

            if (quote.Status != "Gönderildi")
                return BadRequest("Sadece 'Gönderildi' durumundaki teklifler onaylanabilir.");

            try
            {
                // Calculate total amount
                decimal totalAmount = quote.Items.Sum(item =>
                {
                    var netPrice = item.UnitPrice * (1 - (item.DiscountPercent / 100m));
                    return item.Quantity * netPrice;
                });

                // Add VAT (20%)
                totalAmount = totalAmount * 1.20m;

                // Generate sale number
                var saleNo = await GenerateSaleNumber(quote.CustomerName);

                // Get current user ID
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";

                // Create Sale record
                var sale = new Sale
                {
                    CustomerName = quote.CustomerName,
                    SaleNo = saleNo,
                    Date = DateTime.UtcNow,
                    DueDate = CalculateDueDate(quote.PaymentTerm),
                    Amount = totalAmount,
                    TotalPaidAmount = 0,
                    SalesPersonId = userId,
                    IsCompleted = false
                };

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync(); // Save to get sale.Id

                // Update quote
                quote.Status = "Onaylandı";
                quote.ApprovedDate = DateTime.UtcNow;
                quote.SaleId = sale.Id;

                await _context.SaveChangesAsync();

                // Reload with includes
                var updated = await _context.ProductQuotes
                    .Include(q => q.Items)
                    .Include(q => q.Sale)
                    .FirstOrDefaultAsync(q => q.Id == id);

                return Ok(new
                {
                    success = true,
                    quote = updated,
                    sale
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error approving product quote: {ex.Message}");
                return StatusCode(500, new { message = "Teklif onaylanamadı.", error = ex.Message });
            }
        }

        private async Task<string> GenerateQuoteNumber()
        {
            var year = DateTime.Now.Year;
            var todayQuotes = await _context.ProductQuotes
                .Where(q => q.CreatedDate.Year == year)
                .CountAsync();

            var nextNumber = todayQuotes + 1;
            return $"TEK-{year}-{nextNumber:000}";
        }

        private async Task<string> GenerateSaleNumber(string customerName)
        {
            // Use first 3 letters of customer name or "SAT" as prefix
            var prefix = customerName.Length >= 3
                ? customerName.Substring(0, 3).ToUpper()
                : "SAT";

            var todaySales = await _context.Sales
                .Where(s => s.Date.Date == DateTime.UtcNow.Date)
                .CountAsync();

            var nextNumber = todaySales + 1;
            return $"{prefix}-{DateTime.Now:yyyyMMdd}-{nextNumber:000}";
        }
        private DateTime CalculateDueDate(string paymentTerm)
        {
            if (string.IsNullOrEmpty(paymentTerm) || paymentTerm == "Peşin")
                return DateTime.UtcNow;

            // Extract number from string like "30 gün"
            var parts = paymentTerm.Split(' ');
            if (parts.Length > 0 && int.TryParse(parts[0], out int days))
            {
                return DateTime.UtcNow.AddDays(days);
            }

            return DateTime.UtcNow; // Default to today if parsing fails
        }
    }
}
