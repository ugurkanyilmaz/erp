using System;

namespace KetenErp.Core.Entities
{
    public class SalesDemoRecord
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        public string SalesPersonId { get; set; } = string.Empty;
        public string TargetCompany { get; set; } = string.Empty;
        public DateTime TakenDate { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Returned
        public string? Notes { get; set; }
    }
}
