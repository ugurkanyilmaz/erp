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
        public decimal DiscountPercent { get; set; } = 0; // Discount percentage for grand total mode
        public bool UseGrandTotal { get; set; } = false; // Whether to use grand total mode for this item
        public string? Currency { get; set; } // Currency for this item (e.g. "USD", "TRY")
        public List<string> Islemler { get; set; } = new List<string>();
        // list of absolute file paths to photos to render under the product
        public List<string> PhotoPaths { get; set; } = new List<string>();
        public string? Not { get; set; }
    }

    public static class TeklifPdfOlusturucu
    {
        // Define US culture for currency formatting ($)
        private static readonly System.Globalization.CultureInfo UsCulture = new System.Globalization.CultureInfo("en-US");

        static TeklifPdfOlusturucu()
        {
            // QuestPDF Community License - Free for organizations with annual gross revenue below $1M USD
            QuestPDF.Settings.License = LicenseType.Community;
        }

        // baseUrl: optional web base url (e.g. "http://example.com:8443").
        // If provided, photo web links in the PDF will be printed as full URLs using this base.
        // currency: Global currency for the document (defaults to first item's currency if not provided)
        public static byte[] Olustur(string musteriAdi, List<UrunIslem> urunler, string? logoYolu = null, string? genelNot = null, string? belgeNo = null, string? gonderenAdi = null, string? baseUrl = null, string? currency = null)
        {
            Console.WriteLine($"\n[PDF-RENDER] ========== PDF Generator Start ==========");
            Console.WriteLine($"[PDF-RENDER] Customer: {musteriAdi}, Items: {urunler.Count}, BelgeNo: {belgeNo}");
            
            // Use the currency of the first item if not provided
            if (string.IsNullOrEmpty(currency) && urunler.Any())
            {
                currency = urunler.First().Currency ?? "USD";
                Console.WriteLine($"[PDF-RENDER] Currency from first item: {currency}");
            }
            else if (string.IsNullOrEmpty(currency))
            {
                currency = "USD";
                Console.WriteLine($"[PDF-RENDER] Using default currency: USD");
            }
            else
            {
                Console.WriteLine($"[PDF-RENDER] Using provided currency: {currency}");
            }

            // Calculate total amount considering discounts
            Console.WriteLine($"[PDF-RENDER] Calculating totals...");
            decimal toplamTutar = urunler.Sum(u => 
            {
                decimal itemTotal;
                if (u.UseGrandTotal && u.DiscountPercent > 0)
                {
                    itemTotal = u.Fiyat * (1 - (u.DiscountPercent / 100m));
                    Console.WriteLine($"[PDF-RENDER]   Item '{u.UrunAdi}': {u.Fiyat} - {u.DiscountPercent}% = {itemTotal}");
                }
                else
                {
                    itemTotal = u.Fiyat;
                    Console.WriteLine($"[PDF-RENDER]   Item '{u.UrunAdi}': {itemTotal} (no grand total discount)");
                }
                return itemTotal;
            });
            // KDV hesaplama (%20)
            decimal kdvOrani = 0.20m;
            decimal kdvTutar = Math.Round(toplamTutar * kdvOrani, 2);
            decimal kdvliToplam = Math.Round(toplamTutar + kdvTutar, 2);
            Console.WriteLine($"[PDF-RENDER] Total before VAT: {toplamTutar}, VAT: {kdvTutar}, Total with VAT: {kdvliToplam}");
            string belgeTarihi = DateTime.Now.ToString("dd.MM.yyyy");
            if (string.IsNullOrWhiteSpace(belgeNo))
            {
                belgeNo = $"{DateTime.Now:yyyyMMdd}-{DateTime.Now:HHmmss}";
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
                        // Footer text on all pages
                        containerFooter.Column(footerCol =>
                        {
                            footerCol.Item().LineHorizontal(0.5f).LineColor("#E0E0E0");
                            footerCol.Item().PaddingTop(5).Text(txt =>
                            {
                                txt.Span("Keten Pnömatik | ").FontSize(7);
                                txt.Span("Endüstriyel Montaj Ekipmanları").FontSize(7).Italic();
                            });
                        });
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
                            Console.WriteLine($"\n[PDF-RENDER] --- Rendering Item: {urun.UrunAdi} ---");
                            Console.WriteLine($"[PDF-RENDER] UseGrandTotal: {urun.UseGrandTotal}, Fiyat: {urun.Fiyat}, Currency: {urun.Currency}");
                            Console.WriteLine($"[PDF-RENDER] DiscountPercent: {urun.DiscountPercent}%, Islemler.Count: {urun.Islemler.Count}");
                            
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
                                        if (urun.UseGrandTotal)
                                        {
                                            Console.WriteLine($"[PDF-RENDER] Table Mode: GRAND TOTAL (2 columns)");
                                            // Grand total mode: only show Stock Code/Name and Quantity
                                            columns.RelativeColumn(5); // Stok Kodu / Stok Adı
                                            columns.RelativeColumn(2); // Miktar
                                        }
                                        else
                                        {
                                            Console.WriteLine($"[PDF-RENDER] Table Mode: DETAILED PRICING (6 columns)");
                                            // Normal mode: show all columns
                                            columns.RelativeColumn(4); // Stok Kodu / Stok Adı
                                            columns.RelativeColumn(1); // Miktar
                                            columns.RelativeColumn(1.5f); // Liste Fiyatı
                                            columns.RelativeColumn(1); // İndirim
                                            columns.RelativeColumn(1.5f); // İnd. Fiyat
                                            columns.RelativeColumn(1.5f); // Toplam
                                        }
                                    });

                                    // Başlık satırı
                                    table.Header(header =>
                                    {
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).Text("Stok Kodu / Stok Adı").FontSize(9).Bold();
                                        header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                            .Padding(5).AlignCenter().Text("Miktar").FontSize(9).Bold();
                                        
                                        
                                        if (!urun.UseGrandTotal)
                                        {
                                            header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                                .Padding(5).AlignRight().Text("Liste Fiyatı").FontSize(9).Bold();
                                            header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                                .Padding(5).AlignCenter().Text("İnd. %").FontSize(9).Bold();
                                            header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                                .Padding(5).AlignRight().Text("İnd. Fiyat").FontSize(9).Bold();
                                            header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                                .Padding(5).AlignRight().Text("Toplam Fiyat").FontSize(9).Bold();
                                        }
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
                                        
                                        if (!urun.UseGrandTotal)
                                        {
                                            table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                                .Padding(5).AlignRight().Text(parts.ListPrice).FontSize(9);
                                            table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                                .Padding(5).AlignCenter().Text(parts.Discount).FontSize(9);
                                            table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                                .Padding(5).AlignRight().Text(parts.DiscountedPrice).FontSize(9);
                                            table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                                .Padding(5).AlignRight().Text(parts.TotalPrice).FontSize(9).Bold();
                                        }
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
                                    // Render a row of thumbnails (unlimited, wrapping using manual rows)
                                    var validPhotos = urun.PhotoPaths
                                        .Where(p => !string.IsNullOrWhiteSpace(p) && System.IO.File.Exists(p))
                                        .ToList();

                                    if (validPhotos.Count > 0)
                                    {
                                        urunCol.Item().PaddingTop(6).Column(photoGrid =>
                                        {
                                            var columns = 8;
                                            var rows = (int)Math.Ceiling(validPhotos.Count / (double)columns);

                                            for (var r = 0; r < rows; r++)
                                            {
                                                photoGrid.Item().PaddingBottom(4).Row(row =>
                                                {
                                                    row.Spacing(4);
                                                    for (var c = 0; c < columns; c++)
                                                    {
                                                        var index = r * columns + c;
                                                        if (index < validPhotos.Count)
                                                        {
                                                            row.RelativeItem().Height(44).Image(validPhotos[index]).FitArea();
                                                        }
                                                        else
                                                        {
                                                            // Empty item to maintain column width
                                                            row.RelativeItem();
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    else
                                    {
                                        urunCol.Item().PaddingTop(6).Text("(Fotoğraf yok)").FontSize(8).FontColor("#9E9E9E");
                                    }
                                }



                                // Ürün toplamı / Grand Total Info
                                if (urun.UseGrandTotal)
                                {
                                    Console.WriteLine($"[PDF-RENDER] Rendering GRAND TOTAL BOX for {urun.UrunAdi}");
                                    // Grand total mode: show total, discount, and final price
                                    var discountedPrice = urun.Fiyat * (1 - (urun.DiscountPercent / 100));
                                    Console.WriteLine($"[PDF-RENDER] Grand Total: {urun.Fiyat}, Discount: {urun.DiscountPercent}%, Final: {discountedPrice}");
                                    
                                    urunCol.Item().PaddingTop(8).Border(1).BorderColor("#E0E0E0")
                                        .Background("#F5F5F5").Padding(10).Column(grandTotalCol =>
                                    {
                                        grandTotalCol.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text("Toplam Tutar:").FontSize(10);
                                            row.ConstantItem(100).AlignRight().Text(FormatCurrency(urun.Fiyat, currency))
                                                .FontSize(10).Bold();
                                        });
                                        
                                        if (urun.DiscountPercent > 0)
                                        {
                                            grandTotalCol.Item().PaddingTop(3).Row(row =>
                                            {
                                                row.RelativeItem().Text($"İndirim (%{urun.DiscountPercent:0.##}):").FontSize(10)
                                                    .FontColor("#D32F2F");
                                                row.ConstantItem(100).AlignRight()
                                                    .Text($"-{FormatCurrency(urun.Fiyat - discountedPrice, currency)}")
                                                    .FontSize(10).FontColor("#D32F2F");
                                            });
                                        }
                                        
                                        grandTotalCol.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor("#BDBDBD");
                                        
                                        grandTotalCol.Item().PaddingTop(6).Row(row =>
                                        {
                                            row.RelativeItem().Text("Ödenecek Tutar:").FontSize(11).Bold();
                                            row.ConstantItem(100).AlignRight()
                                                .Text(FormatCurrency(discountedPrice, currency))
                                                .FontSize(11).Bold().FontColor("#1565C0");
                                        });
                                    });
                                }
                                else
                                {
                                    Console.WriteLine($"[PDF-RENDER] Rendering SUBTOTAL for {urun.UrunAdi}: {urun.Fiyat}");
                                    // Normal mode: show simple subtotal
                                    urunCol.Item().PaddingTop(5).AlignRight()
                                        .Text($"Ara Toplam: {FormatCurrency(urun.Fiyat, currency)}")
                                        .FontSize(11).Bold().FontColor("#1565C0");
                                }
                            });
                        }

                        // Genel Toplam - Vurgulu kutu
                        col.Item().PaddingTop(10).Background("#E8F5E9").Border(1.5f)
                            .BorderColor("#4CAF50").Padding(12).Row(row =>
                            {
                                row.RelativeItem().Text("Genel Toplam").FontSize(13).Bold();
                                row.ConstantItem(150).AlignRight().Text($"{FormatCurrency(toplamTutar, currency)}")
                                    .FontSize(14).Bold().FontColor("#2E7D32");
                            });

                        // Teklif geçerlilik bilgisi
                        col.Item().PaddingTop(6).Text("Tamir Teklifi — 7 gün geçerlidir.").FontSize(10).Italic();

                        // KDV Tutarı
                        col.Item().PaddingTop(6).Row(kdvRow =>
                        {
                            kdvRow.RelativeItem().Text($"KDV (%{(kdvOrani * 100):0}) Tutarı").FontSize(10);
                            kdvRow.ConstantItem(150).AlignRight().Text($"{FormatCurrency(kdvTutar, currency)}").FontSize(10);
                        });

                        // KDV dahil toplam
                        col.Item().PaddingTop(6).Background("#FFF3E0").Border(1).BorderColor("#FFB74D").Padding(10).Row(row =>
                        {
                            row.RelativeItem().Text("KDV Dahil Toplam Tutar").FontSize(12).Bold();
                            row.ConstantItem(150).AlignRight().Text($"{FormatCurrency(kdvliToplam, currency)}")
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
                                            // If a baseUrl is provided, emit a full absolute URL so customers don't see internal IPs
                                            if (!string.IsNullOrWhiteSpace(baseUrl))
                                            {
                                                displayLink = baseUrl.TrimEnd('/') + "/" + rel;
                                            }
                                            else
                                            {
                                                displayLink = "/" + rel;
                                            }
                                        }

                                        // Print the link as plain text (many PDF viewers auto-detect URLs). Also include original path in parens.
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
                        // Footer Image (Only on the last page, at the end of content)
                        var footerImagePath = System.IO.Path.Combine(AppContext.BaseDirectory, "Services", "footer.jpg");
                        if (System.IO.File.Exists(footerImagePath))
                        {
                            col.Item().PaddingTop(20).Height(60).Image(footerImagePath).FitWidth();
                        }
                    });
                });
            });
            
            Console.WriteLine($"[PDF-RENDER] ========== PDF Generation Complete ==========\n");

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

                            // Miktar parse et (parça veya hizmet için)
                            // Supports "Name x5" or "Name (x5)"
                            if (beforeColon.Contains(" x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                qty = beforeColon.Substring(xIndex + 2).Trim();
                            }
                            else if (beforeColon.Contains(" (x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" (x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                var endParen = beforeColon.IndexOf(')', xIndex);
                                if (endParen > xIndex)
                                {
                                    qty = beforeColon.Substring(xIndex + 3, endParen - (xIndex + 3)).Trim();
                                }
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
                        if (decimal.TryParse(qty.Replace(",", "."), System.Globalization.NumberStyles.Any, 
                            System.Globalization.CultureInfo.InvariantCulture, out var qtyVal))
                        {
                            // Remove currency symbols and whitespace
                            var cleanPrice = System.Text.RegularExpressions.Regex.Replace(discountedPrice, @"[^\d.,]", "").Trim();
                            
                            // Try parsing with InvariantCulture (dot decimal) first
                            if (!decimal.TryParse(cleanPrice, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var priceVal))
                            {
                                // If failed, try parsing with TR culture (comma decimal)
                                var trCulture = new System.Globalization.CultureInfo("tr-TR");
                                if (decimal.TryParse(cleanPrice, System.Globalization.NumberStyles.Any, trCulture, out var priceValTr))
                                {
                                    priceVal = priceValTr;
                                }
                            }
                            
                            // If we successfully parsed the price, calculate total
                            if (priceVal > 0)
                            {
                                totalPrice = (qtyVal * priceVal).ToString("N2", UsCulture);
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

                            if (beforeColon.Contains(" x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                qty = beforeColon.Substring(xIndex + 2).Trim();
                            }
                            else if (beforeColon.Contains(" (x"))
                            {
                                var xIndex = beforeColon.LastIndexOf(" (x");
                                name = beforeColon.Substring(0, xIndex).Trim();
                                var endParen = beforeColon.IndexOf(')', xIndex);
                                if (endParen > xIndex)
                                {
                                    qty = beforeColon.Substring(xIndex + 3, endParen - (xIndex + 3)).Trim();
                                }
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

                // Format quantity: remove decimals if integer (e.g. "1,00" -> "1")
                if (decimal.TryParse(qty, System.Globalization.NumberStyles.Any, new System.Globalization.CultureInfo("tr-TR"), out var qVal))
                {
                    if (qVal % 1 == 0) qty = qVal.ToString("F0");
                }

                return (name, qty, listPrice, discount, discountedPrice, totalPrice);
            }
            catch
            {
                // Parse hatası durumunda güvenli değerler döndür
                return (islem, "1", "0,00", "0,00", "0,00", "0,00");
            }
        }

        // Helper method to format currency based on selected currency code
        private static string FormatCurrency(decimal amount, string? currency)
        {
            return (currency?.ToUpperInvariant()) switch
            {
                "EUR" => $"€{amount:N2}",
                "TRY" => $"₺{amount:N2}",
                _ => $"${amount:N2}" // Default to USD
            };
        }
    }
}
