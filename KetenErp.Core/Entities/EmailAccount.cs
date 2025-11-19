using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace KetenErp.Core.Entities
{
    public class EmailAccount
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // display name
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string? UserName { get; set; }
        public string? EncryptedPassword { get; set; }
    public string FromAddress { get; set; } = string.Empty;
        public bool UseTls { get; set; } = true;
        public bool IsActive { get; set; } = false;
        public string? CreatedBy { get; set; }
        [Column(TypeName = "timestamp with time zone")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
