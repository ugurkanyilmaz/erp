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
        public string? ServisTakipNo { get; set; }
        public string? SKU { get; set; }
        public decimal Fiyat { get; set; }
        public List<string> Islemler { get; set; } = new List<string>();
        // list of absolute file paths to photos to render under the product
        public List<string> PhotoPaths { get; set; } = new List<string>();
        public string? Not { get; set; }
    }

    public static class TeklifPdfOlusturucu
    {
        static TeklifPdfOlusturucu()
        {
            // QuestPDF Community License - Free for organizations with annual gross revenue below $1M USD
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Olustur(string musteriAdi, List<UrunIslem> urunler, string? logoYolu = null, string? genelNot = null, string? belgeNo = null, string? gonderenAdi = null)
        {
            decimal toplamTutar = urunler.Sum(u => u.Fiyat);
            // KDV hesaplama (%20)
            decimal kdvOrani = 0.20m;
            decimal kdvTutar = Math.Round(toplamTutar * kdvOrani, 2);
            decimal kdvliToplam = Math.Round(toplamTutar + kdvTutar, 2);
            string belgeTarihi = DateTime.UtcNow.ToString("dd.MM.yyyy");
            if (string.IsNullOrWhiteSpace(belgeNo))
            {
                belgeNo = $"{DateTime.UtcNow:yyyyMMdd}-{DateTime.UtcNow:HHmmss}";
            }

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);

                    // --- HEADER (show only on the first page) ---
                    page.Header().ShowOnce().Column(headerCol =>
                    {
                        var servicesFolder = System.IO.Path.Combine(AppContext.BaseDirectory, "Services");
                        var pngLogoPath = System.IO.Path.Combine(servicesFolder, "logo.png");

                        // Row: Logo (left) + TEKLİF FORMU (right, vertically centered)
                        headerCol.Item().Row(row =>
                        {
                            // Logo area (left)
                            row.ConstantItem(200).Height(80).Element(el =>
                            {
                                if (System.IO.File.Exists(pngLogoPath))
                                {
                                    el.Image(pngLogoPath).FitArea();
                                }
                                else if (!string.IsNullOrEmpty(logoYolu) && System.IO.File.Exists(logoYolu))
                                {
                                    el.Image(logoYolu).FitArea();
                                }
                                else
                                {
                                    Console.WriteLine($"[PDF] No header logo found. Checked: {pngLogoPath}, {logoYolu}");
                                }
                            });

                            // TEKLİF FORMU (right side, vertically aligned to center)
                            row.RelativeItem().AlignMiddle().AlignRight().Text("TEKLİF FORMU")
                                .FontSize(20).Bold().FontColor("#D32F2F");
                        });

                        // Separator line below header
                        headerCol.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor("#D32F2F");
                    });

                    // --- FOOTER (anchored to bottom of every page) ---
                    page.Footer().AlignBottom().Element(containerFooter =>
                    {
                        var footerImagePath = System.IO.Path.Combine(AppContext.BaseDirectory, "Services", "footer.jpg");
                        if (System.IO.File.Exists(footerImagePath))
                        {
                            containerFooter.Height(60).Image(footerImagePath).FitWidth();
                        }
                        else
                        {
                            Console.WriteLine($"[PDF] Footer image not found at: {footerImagePath}");
                            containerFooter.Column(footerCol =>
                            {
                                footerCol.Item().LineHorizontal(0.5f).LineColor("#E0E0E0");
                                footerCol.Item().PaddingTop(5).Text(txt =>
                                {
                                    txt.Span("Keten Pnömatik | ").FontSize(7);
                                    txt.Span("Endüstriyel Montaj Ekipmanları").FontSize(7).Italic();
                                });
                            });
                        }
                    });

                    // --- CONTENT ---
                    page.Content().PaddingBottom(15).Column(col =>
                    {
                        // Müşteri ve Belge Bilgileri - Kutu içinde
                        col.Item().Border(1).BorderColor("#E0E0E0").Padding(10).Column(infoCol =>
                        {
                            infoCol.Item().Row(row =>
                            {
                                row.RelativeItem().Text($"Sayın: {musteriAdi}").FontSize(11).Bold();
                                row.ConstantItem(150).AlignRight().Text($"Tarih: {belgeTarihi}").FontSize(10);
                            });
                            infoCol.Item().PaddingTop(3).Row(row =>
                            {
                                row.RelativeItem().Text("").FontSize(10);
                                row.ConstantItem(150).AlignRight().Text($"Belge No: {belgeNo}").FontSize(10);
                            });
                        });

                        col.Item().PaddingTop(15);

                        // Her ürün için ayrı tablo
                        foreach (var urun in urunler)
                        {
                            col.Item().PaddingBottom(15).Column(urunCol =>
                            {
                                // Ürün başlığı - renkli arka plan
                                urunCol.Item().Background("#F5F5F5").Padding(8).Row(titleRow =>
                                {
                                    titleRow.RelativeItem().Text($"{urun.UrunAdi}")
                                        .FontSize(12).Bold();
                                });

                                // Seri No ve SKU bilgisi
                                if (!string.IsNullOrWhiteSpace(urun.ServisTakipNo) || !string.IsNullOrWhiteSpace(urun.SKU))
                                {
                                    urunCol.Item().Background("#FAFAFA").Padding(6).Row(infoRow =>
                                    {
                                        if (!string.IsNullOrWhiteSpace(urun.ServisTakipNo))
                                        {
                                            infoRow.RelativeItem().Text($"Servis Takip No: {urun.ServisTakipNo}")
                                                .FontSize(9);
                                        }
                                        if (!string.IsNullOrWhiteSpace(urun.SKU))
                                        {
                                            infoRow.RelativeItem().Text($"SKU: {urun.SKU}")
                                                .FontSize(9).Italic();
                                        }
                                    });
                                }

                                // Tablo başlıkları
                                urunCol.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(4); // Stok Kodu / Stok Adı
                                        columns.RelativeColumn(1); // Miktar
                                        columns.RelativeColumn(1.5f); // Liste Fiyatı
                                        columns.RelativeColumn(1); // İndirim
                                        columns.RelativeColumn(1.5f); // İnd. Fiyat
                                        columns.RelativeColumn(1.5f); // Toplam
                                    });

                                    // Başlık satırı
                                    table.Header(header =>
                                    {
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).Text("Stok Kodu / Stok Adı").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignCenter().Text("Miktar").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignRight().Text("Liste Fiyatı").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignCenter().Text("İnd. %").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignRight().Text("İnd. Fiyat").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignRight().Text("Toplam Fiyat").FontSize(9).Bold();
                                    });

                                    // İşlem satırları
                                    foreach (var islem in urun.Islemler)
                                    {
                                        // İşlem formatı parse et: "Parça: Name xQty : Price" veya "Hizmet: Name : Price"
                                        var parts = ParseIslemLine(islem);
                                        
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).Text(parts.Name).FontSize(9);
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).AlignCenter().Text(parts.Quantity).FontSize(9);
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).AlignRight().Text(parts.ListPrice).FontSize(9);
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).AlignCenter().Text(parts.Discount).FontSize(9);
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).AlignRight().Text(parts.DiscountedPrice).FontSize(9);
                                        table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                            .Padding(5).AlignRight().Text(parts.TotalPrice).FontSize(9).Bold();
                                    }
                                });

                                // Notu sadece fotoğraf yoksa göster (fotoğrafların üstünde çift görünmemesi için)
                                if (!string.IsNullOrWhiteSpace(urun.Not) && (urun.PhotoPaths == null || urun.PhotoPaths.Count == 0))
                                {
                                    urunCol.Item().PaddingTop(5).Border(1).BorderColor("#FFF9C4")
                                        .Background("#FFFDE7").Padding(8)
                                        .Text($"Not: {urun.Not}")
                                        .FontSize(9).Italic();
                                }

                                // Fotoğraflar (varsa) - küçük thumbnail'lar halinde göster
                                if (urun.PhotoPaths != null && urun.PhotoPaths.Count > 0)
                                {
                                    // If there's a note, show it above the photos
                                    if (!string.IsNullOrWhiteSpace(urun.Not))
                                    {
                                        urunCol.Item().PaddingTop(4)
                                            .Background("#FFF9C4").Padding(6)
                                            .Text($"Not: {urun.Not}")
                                            .FontSize(9).Italic().FontColor("#555");
                                    }

                                    // Render a row of thumbnails (max 7)
                                    urunCol.Item().PaddingTop(6).Row(photoRow =>
                                    {
                                        var shown = 0;
                                        foreach (var p in urun.PhotoPaths.Take(7))
                                        {
                                            try
                                            {
                                                if (!string.IsNullOrWhiteSpace(p) && System.IO.File.Exists(p))
                                                {
                                                    // reserve smaller constant width for each thumbnail (reduced size)
                                                    photoRow.ConstantItem(56).Height(44).PaddingRight(4).Element(el =>
                                                    {
                                                        el.Image(p).FitArea();
                                                    });
                                                    shown++;
                                                }
                                            }
                                            catch (Exception ex)
                                            {
                                                Console.WriteLine("[PDF] Photo render error: " + ex.Message);
                                            }
                                        }

                                        if (shown == 0)
                                        {
                                            photoRow.RelativeItem().Text("(Fotoğraf yok)").FontSize(8).FontColor("#9E9E9E");
                                        }
                                    });
                                }

                                // Ürün toplamı
                                urunCol.Item().PaddingTop(5).AlignRight()
                                    .Text($"Ara Toplam: {urun.Fiyat:C2}")
                                    .FontSize(11).Bold().FontColor("#1565C0");
                            });
                        }

                        // Genel Toplam - Vurgulu kutu
                        col.Item().PaddingTop(10).Background("#E8F5E9").Border(1.5f)
                            .BorderColor("#4CAF50").Padding(12).Row(row =>
                            {
                                row.RelativeItem().Text("Genel Toplam").FontSize(13).Bold();
                                row.ConstantItem(150).AlignRight().Text($"{toplamTutar:C2}")
                                    .FontSize(14).Bold().FontColor("#2E7D32");
                            });

                        // Teklif geçerlilik bilgisi
                        col.Item().PaddingTop(6).Text("Tamir Teklifi — 7 gün geçerlidir.").FontSize(10).Italic();

                        // KDV Tutarı
                        col.Item().PaddingTop(6).Row(kdvRow =>
                        {
                            kdvRow.RelativeItem().Text($"KDV (%{(kdvOrani * 100):0}) Tutarı").FontSize(10);
                            kdvRow.ConstantItem(150).AlignRight().Text($"{kdvTutar:C2}").FontSize(10);
                        });

                        // KDV dahil toplam
                        col.Item().PaddingTop(6).Background("#FFF3E0").Border(1).BorderColor("#FFB74D").Padding(10).Row(row =>
                        {
                            row.RelativeItem().Text("Ödenecek (KDV %20 dahil)").FontSize(12).Bold();
                            row.ConstantItem(150).AlignRight().Text($"{kdvliToplam:C2}")
                                .FontSize(12).Bold().FontColor("#BF360C");
                        });

                        // Genel not (eğer varsa)
                        if (!string.IsNullOrWhiteSpace(genelNot))
                        {
                            col.Item().PaddingTop(15).Border(1).BorderColor("#E0E0E0")
                                .Padding(10).Column(notCol =>
                                {
                                    notCol.Item().Text("Genel Notlar:").FontSize(10).Bold();
                                    notCol.Item().PaddingTop(3).Text(genelNot).FontSize(9);
                                });
                        }

                        // İmza alanı
                        col.Item().PaddingTop(20).Row(row =>
                        {
                            row.RelativeItem().Column(leftCol =>
                            {
                                leftCol.Item().Text("Saygılarımızla,").FontSize(9);
                                var signName = string.IsNullOrWhiteSpace(gonderenAdi) ? "Keten Pnömatik" : gonderenAdi;
                                leftCol.Item().Text(signName).FontSize(9).Bold();
                            });
                        });

                        // Fotoğraf linkleri: tüm ürünlerde yer alan fotoğraf yollarını topla ve
                        // eğer wwwroot altında yer alıyorsa web yolunu (/uploads/...) olarak yaz.
                        var allPhotos = urunler.SelectMany(u => u.PhotoPaths ?? new List<string>()).Where(p => !string.IsNullOrWhiteSpace(p)).Distinct().ToList();
                        if (allPhotos.Count > 0)
                        {
                            col.Item().PaddingTop(12).Border(1).BorderColor("#E0E0E0").Padding(10).Column(photoCol =>
                            {
                                photoCol.Item().Text("Fotoğraflar ve erişim linkleri:").FontSize(10).Bold();
                                foreach (var ph in allPhotos)
                                {
                                    try
                                    {
                                        var displayLink = ph;
                                        // Try to convert to a web-relative path if inside wwwroot
                                        var wwwRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
                                        if (!string.IsNullOrWhiteSpace(ph) && ph.StartsWith(wwwRoot, StringComparison.OrdinalIgnoreCase))
                                        {
                                            var rel = ph.Substring(wwwRoot.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Replace("\\", "/");
                                            displayLink = "/" + rel;
                                        }
                                        // Print the link as plain text (many PDF viewers auto-detect URLs). Also include original path in parens.
                                        // Use slightly smaller font sizes so the block doesn't look too heavy.
                                        photoCol.Item().PaddingTop(4).Text(t =>
                                        {
                                            t.Span(displayLink).FontSize(8).FontColor("#1565C0");
                                            t.Span(" ");
                                            t.Span("(").FontSize(7).FontColor("#777");
                                            t.Span(ph).FontSize(7).FontColor("#777");
                                            t.Span(")").FontSize(7).FontColor("#777");
                                        });
                                    }
                                    catch { /* ignore individual photo link issues */ }
                                }
                            });
                        }
                    });
                });
            });

            return doc.GeneratePdf();
        }

        // Yardımcı metod: İşlem satırını parse et
        private static (string Name, string Quantity, string ListPrice, string Discount, string DiscountedPrice, string TotalPrice) ParseIslemLine(string islem)
        {
            try
            {
                // Format örnekleri:
                // "Parça: Name xQty : Price (Liste: ListPrice, İndirim: Disc%)"
                // "Hizmet: Name : Price (Liste: ListPrice, İndirim: Disc%)"
                // "Parça: Name xQty : Price"
                // "Hizmet: Name : Price"

                var name = "";
                var qty = "1,00";
                var listPrice = "0,00";
                var discount = "0,00";
                var discountedPrice = "0,00";
                var totalPrice = "0,00";

                if (islem.StartsWith("Parça:") || islem.StartsWith("Hizmet:"))
                {
                    var isPart = islem.StartsWith("Parça:");
                    var content = islem.Substring(islem.IndexOf(':') + 1).Trim();

                    // Parantez içi bilgi var mı kontrol et
                    var hasParenthesis = content.Contains("(Liste:");
                    
                    if (hasParenthesis)
                    {
                        var mainPart = content.Substring(0, content.IndexOf('(') - 1).Trim();
                        var detailPart = content.Substring(content.IndexOf('(') + 1).TrimEnd(')');

                        // Ana kısım: "Name xQty : Price" veya "Name : Price"
                        var colonIndex = mainPart.LastIndexOf(':');
                        if (colonIndex > 0)
                        {
                            var beforeColon = mainPart.Substring(0, colonIndex).Trim();
                            var afterColon = mainPart.Substring(colonIndex + 1).Trim();

                            // Miktar parse et (parça için)
                            if (isPart && beforeColon.Contains(" x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                qty = beforeColon.Substring(xIndex + 2).Trim();
                            }
                            else
                            {
                                name = beforeColon;
                            }

                            discountedPrice = afterColon;
                            totalPrice = afterColon;
                        }

                        // Detay kısım: "Liste: X, İndirim: Y%"
                        var detailParts = detailPart.Split(',');
                        foreach (var dp in detailParts)
                        {
                            if (dp.Contains("Liste:"))
                            {
                                listPrice = dp.Substring(dp.IndexOf(':') + 1).Trim();
                            }
                            else if (dp.Contains("İndirim:"))
                            {
                                discount = dp.Substring(dp.IndexOf(':') + 1).Replace("%", "").Trim();
                            }
                        }

                        // Toplam hesapla (miktar varsa)
                        if (isPart && decimal.TryParse(qty.Replace(",", "."), System.Globalization.NumberStyles.Any, 
                            System.Globalization.CultureInfo.InvariantCulture, out var qtyVal))
                        {
                            var priceStr = discountedPrice.Replace("₺", "").Replace(",", ".").Trim();
                            if (decimal.TryParse(priceStr, System.Globalization.NumberStyles.Any,
                                System.Globalization.CultureInfo.InvariantCulture, out var priceVal))
                            {
                                totalPrice = (qtyVal * priceVal).ToString("N2") + " ₺";
                            }
                        }
                    }
                    else
                    {
                        // Parantez yok: basit format "Name xQty : Price" veya "Name : Price"
                        var colonIndex = content.LastIndexOf(':');
                        if (colonIndex > 0)
                        {
                            var beforeColon = content.Substring(0, colonIndex).Trim();
                            var afterColon = content.Substring(colonIndex + 1).Trim();

                            if (isPart && beforeColon.Contains(" x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                qty = beforeColon.Substring(xIndex + 2).Trim();
                            }
                            else
                            {
                                name = beforeColon;
                            }

                            listPrice = afterColon;
                            discountedPrice = afterColon;
                            totalPrice = afterColon;
                        }
                    }
                }

                return (name, qty, listPrice, discount, discountedPrice, totalPrice);
            }
            catch
            {
                // Parse hatası durumunda güvenli değerler döndür
                return (islem, "1,00", "0,00", "0,00", "0,00", "0,00");
            }
        }
    }
}
