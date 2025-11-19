using System;

namespace KetenErp.Core.Service
{
    public class ServiceRecordPhoto
    {
        public int Id { get; set; }
        public int ServiceRecordId { get; set; }
        public string? BelgeNo { get; set; }  // Belge numarasına göre fotoğrafları organize et
        public string? FileName { get; set; }
        public string? FilePath { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // navigation
        public ServiceRecord? ServiceRecord { get; set; }
    }
}
