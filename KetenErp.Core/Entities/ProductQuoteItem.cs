using System;

namespace KetenErp.Core.Entities
{
    public class ProductQuoteItem
    {
        public int Id { get; set; }
        public int ProductQuoteId { get; set; }
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; } = 0;
        
        // Navigation properties
        public ProductQuote? ProductQuote { get; set; }
        public Product? Product { get; set; }
    }
}
