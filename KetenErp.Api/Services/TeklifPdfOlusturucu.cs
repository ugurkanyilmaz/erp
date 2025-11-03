using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace KetenErp.Api.Services
{
    public class UrunIslem
    {
        public string? UrunAdi { get; set; }
        public string? SeriNo { get; set; }
        public decimal Fiyat { get; set; }
        public List<string> Islemler { get; set; } = new List<string>();
        public string? Not { get; set; }
    }

    public static class TeklifPdfOlusturucu
    {
        static TeklifPdfOlusturucu()
        {
            // QuestPDF Community License - Free for organizations with annual gross revenue below $1M USD
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Olustur(string musteriAdi, List<UrunIslem> urunler, string? logoYolu = null, string? genelNot = null)
        {
            decimal toplamTutar = urunler.Sum(u => u.Fiyat);

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(40);
                    page.Size(PageSizes.A4);

                    // --- HEADER ---
                    page.Header().Row(row =>
                    {
                        // Logo - daha büyük ve belirgin
                        if (!string.IsNullOrEmpty(logoYolu) && File.Exists(logoYolu))
                        {
                            row.ConstantItem(150).Image(logoYolu);
                        }
                        else
                        {
                            row.ConstantItem(150).Text(""); // Boşluk
                        }

                        row.RelativeItem().Column(col =>
                        {
                            col.Item().AlignRight().Text("TEKLİF BELGESİ").FontSize(20).Bold();
                            col.Item().AlignRight().Text(DateTime.Now.ToString("dd.MM.yyyy"));
                        });
                    });

                    // --- CONTENT ---
                    page.Content().PaddingVertical(20).Column(col =>
                    {
                        col.Item().PaddingBottom(10).Text($"Müşteri: {musteriAdi}").FontSize(12);

                        foreach (var urun in urunler)
                        {
                            // Ürün başlığı
                            col.Item().PaddingTop(10).Text($"Ürün: {urun.UrunAdi}")
                                .FontSize(13)
                                .Bold()
                                .Underline();

                            // Seri No (eğer varsa)
                            if (!string.IsNullOrWhiteSpace(urun.SeriNo))
                            {
                                col.Item().PaddingLeft(15).Text($"Seri No: {urun.SeriNo}")
                                    .FontSize(11);
                            }

                            // İşlemler (madde madde)
                            foreach (var islem in urun.Islemler)
                            {
                                col.Item().PaddingLeft(15).Text($"• {islem}").FontSize(11);
                            }

                            // Not (eğer varsa)
                            if (!string.IsNullOrWhiteSpace(urun.Not))
                            {
                                col.Item().PaddingLeft(15).PaddingTop(5)
                                    .Text($"Not: {urun.Not}")
                                    .FontSize(10)
                                    .Italic();
                            }

                            // Fiyat
                            col.Item().PaddingLeft(15).PaddingBottom(10).Text($"Toplam: {urun.Fiyat:C}")
                                .FontSize(11)
                                .Bold();
                        }

                        // Genel toplam
                        col.Item().PaddingTop(20).AlignRight()
                            .Text($"Genel Toplam: {toplamTutar:C}")
                            .FontSize(13)
                            .Bold();

                        // Genel not (eğer varsa)
                        if (!string.IsNullOrWhiteSpace(genelNot))
                        {
                            col.Item().PaddingTop(15)
                                .Text($"Genel Not: {genelNot}")
                                .FontSize(11)
                                .Italic();
                        }

                        col.Item().PaddingTop(15)
                            .Text("Saygılarımızla,\nKeten Pnömatik Teknik Servis Departmanı")
                            .FontSize(11);
                    });

                    // --- FOOTER ---
                    page.Footer().AlignCenter()
                        .Text("Bu teklif Keten ERP tarafından otomatik oluşturulmuştur.");
                });
            });

            return doc.GeneratePdf();
        }
    }
}
