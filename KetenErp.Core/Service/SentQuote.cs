using System;

namespace KetenErp.Core.Service
{
    public class SentQuote
    {
        public int Id { get; set; }
        public string? RecipientEmail { get; set; }
        public string? BelgeNo { get; set; }
        public string? PdfFileName { get; set; }
        public DateTime SentAt { get; set; }
        public string? ServiceRecordIds { get; set; } // comma-separated list of record IDs in the quote
        public string? CustomerName { get; set; }
        // Optional sender name (Gönderen) provided when sending bulk quotes
        public string? SenderName { get; set; }
        
        // Quote type categorization for archive
        public string QuoteType { get; set; } = "Service"; // "Service" or "Product"
        public int? ProductQuoteId { get; set; } // If QuoteType is "Product"
    }
}
