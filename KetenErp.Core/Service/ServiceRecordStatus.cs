namespace KetenErp.Core.Service
{
    public static class ServiceRecordStatus
    {
        public const string KayitAcildi = "Kayıt Açıldı";
        public const string OnayBekliyor = "Onay Bekliyor";
        public const string TeklifBekliyor = "Teklif Bekliyor";
        public const string TeklifGonderildi = "Teklif Gönderildi";
        public const string Islemede = "İşlemde";
        public const string Tamamlandi = "Tamamlandı";

        public static string[] All => new[] { KayitAcildi, OnayBekliyor, TeklifBekliyor, TeklifGonderildi, Islemede, Tamamlandi };

        public static bool IsValid(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return false;
            foreach (var v in All) if (v == s) return true;
            return false;
        }
    }
}
