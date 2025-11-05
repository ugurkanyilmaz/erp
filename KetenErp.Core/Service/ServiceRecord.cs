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

        public ICollection<ServiceOperation> Operations { get; set; } = new List<ServiceOperation>();
    }
}
