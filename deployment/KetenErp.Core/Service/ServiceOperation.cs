using System;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace KetenErp.Core.Service
{
    public class ServiceOperation
    {
        public int Id { get; set; }
        public int ServiceRecordId { get; set; }
        public ServiceRecord? ServiceRecord { get; set; }

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? IslemBitisTarihi { get; set; }
        public string? YapanKisi { get; set; }

        public ICollection<ChangedPart> ChangedParts { get; set; } = new List<ChangedPart>();
        public ICollection<ServiceItem> ServiceItems { get; set; } = new List<ServiceItem>();
    }
}
