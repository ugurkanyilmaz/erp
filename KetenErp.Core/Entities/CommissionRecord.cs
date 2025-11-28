using System;

namespace KetenErp.Core.Entities
{
    public class CommissionRecord
    {
        public int Id { get; set; }
        public string SalesPersonId { get; set; } = string.Empty;
        public int SaleId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public virtual Sale? Sale { get; set; }
    }
}
