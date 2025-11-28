using System;

namespace KetenErp.Core.Entities
{
    public class Sale
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string SaleNo { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public string SalesPersonId { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
    }
}
