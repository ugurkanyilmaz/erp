using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace KetenErp.Core.Entities
{
    public class Suggestion
    {
        public int Id { get; set; }
        // key to group suggestions, e.g. "ts_alanKisi" or "ts_yapanKisi"
        public string Key { get; set; } = string.Empty;
        // suggestion value
        public string Value { get; set; } = string.Empty;
        public int? SortOrder { get; set; }
        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
    }
}
