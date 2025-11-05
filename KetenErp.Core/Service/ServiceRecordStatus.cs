namespace KetenErp.Core.Service
{
    public static class ServiceRecordStatus
    {
        public const string KayitAcildi = "Kayıt Açıldı";
        public const string Onaylandi = "Onaylandı";
    public const string TeklifBekliyor = "Teklif Bekliyor";
    public const string OnayBekliyor = "Onay Bekliyor";
        public const string Islemede = "İşlemde";
        public const string Tamamlandi = "Tamamlandı";

    // Keep the statuses that are actively used. 'Teklif Gönderildi' is not used — after teklif gönderme we mark records as 'Onay Bekliyor'.
    public static string[] All => new[] { KayitAcildi, Onaylandi, TeklifBekliyor, OnayBekliyor, Islemede, Tamamlandi };

        public static bool IsValid(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return false;
            foreach (var v in All) if (v == s) return true;
            return false;
        }
    }
}
