using System;
using System.Collections.Generic;
using KetenErp.Core.Entities;

namespace KetenErp.Core.Entities
{
    public class ProductQuote
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string QuoteNo { get; set; } = string.Empty; // TEK-2024-001 gibi
        public DateTime CreatedDate { get; set; }
        public DateTime? SentDate { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public string Status { get; set; } = "Taslak"; // Taslak, Gönderildi, Onaylandı
        public int? SaleId { get; set; } // Onaylandığında oluşan Sale ID
        public int? SentQuoteId { get; set; } // Arşive kaydedildiğinde
        public string? Notes { get; set; }
        public string Currency { get; set; } = "TRY"; // USD, EUR, TRY
        public string PaymentTerm { get; set; } = "Peşin"; // Peşin, 15 gün, 30 gün, 45 gün, 60 gün, 90 gün
        
        // Navigation properties
        public Sale? Sale { get; set; }
        public Service.SentQuote? SentQuote { get; set; }
        public List<ProductQuoteItem> Items { get; set; } = new List<ProductQuoteItem>();
    }
}
