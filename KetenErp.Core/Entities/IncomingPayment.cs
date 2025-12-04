using System;

namespace KetenErp.Core.Entities
{
    public class IncomingPayment
    {
        public int Id { get; set; }
        public string TargetAccount { get; set; } = string.Empty;
        public string Sender { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public int? SaleId { get; set; }
        public Sale? Sale { get; set; }
    }
}
