using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace KetenErp.Core.Service
{
    // A lightweight archive record that stores the full service record as JSON
    // plus a few indexed columns for quick lookup in the archive UI.
    public class CompletedServiceRecord
    {
        public int Id { get; set; }

        // Original ServiceRecord id (from active table) so we can trace back if needed
        public int? OriginalServiceRecordId { get; set; }

        // Basic, searchable fields copied for convenience
        public string? BelgeNo { get; set; }
        public string? ServisTakipNo { get; set; }
        public string? FirmaIsmi { get; set; }
        public string? UrunModeli { get; set; }
        public DateTime? GelisTarihi { get; set; }

        // When it was archived/completed
        [Column(TypeName = "timestamp with time zone")]
        public DateTime CompletedAt { get; set; }

        // Serialized JSON of the full service record (includes operations, photos metadata, notes etc.)
        // Stored as TEXT in the database.
        public string? SerializedRecordJson { get; set; }
    }
}
