using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace KetenErp.Core.Service
{
    public class ServiceTemplate
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ProductSKU { get; set; }
        
        // JSON strings to store arrays of changed parts and service items
        public string? ChangedPartsJson { get; set; }
        public string? ServiceItemsJson { get; set; }
        
        public string? YapanKisi { get; set; }
        
        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
