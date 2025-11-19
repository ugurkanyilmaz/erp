using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace KetenErp.Core.Entities
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        [Column(TypeName = "timestamp with time zone")]
        public DateTime ExpiresAt { get; set; }

        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; }

        [Column(TypeName = "timestamp with time zone")]
        public DateTime? RevokedAt { get; set; }
        // optional: reason or replaced by token id
        public string? ReplacedByToken { get; set; }
    }
}
