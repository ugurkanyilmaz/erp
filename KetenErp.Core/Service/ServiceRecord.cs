using System;
using System.Collections.Generic;

namespace KetenErp.Core.Service
{
    public class ServiceRecord
    {
        public int Id { get; set; }
    public string? ServisTakipNo { get; set; }
        public string? UrunModeli { get; set; }
        public string? FirmaIsmi { get; set; }
        public DateTime GelisTarihi { get; set; }
    // status of the record (e.g., "Kayıt Açıldı", "İşlemde", "Tamamlandı") persisted in DB
    public string? Durum { get; set; } = ServiceRecordStatus.KayitAcildi;
        public string? BelgeNo { get; set; }
        public string? AlanKisi { get; set; }
        public string? Notlar { get; set; }
        // Currency for quote generation (USD, EUR, TRY)
        public string? Currency { get; set; }
        // Optional override for grand total pricing
        public decimal? GrandTotalOverride { get; set; }
        // Optional discount percentage for grand total override
        public decimal? GrandTotalDiscount { get; set; }

        public ICollection<ServiceOperation> Operations { get; set; } = new List<ServiceOperation>();
    }
}
