using System;
using System.Collections.Generic;

namespace KetenErp.Core.Entities
{
    public class Order
    {
        public int Id { get; set; }
        public string Supplier { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = "Sipariş Verildi"; // Sipariş Verildi, Hazırlanıyor, Yolda, Gümrükte, Ulaştı
        public bool IsArchived { get; set; }
        
        // Navigation property
        public List<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
