using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;

namespace KetenErp.Api.Services
{
    public static class UrunSatisPdfOlusturucu
    {
        public class ProductQuoteItemDto
        {
            public string ProductName { get; set; } = string.Empty;
            public string? SKU { get; set; }
            public int Quantity { get; set; }
            public decimal ListPrice { get; set; }
            public decimal DiscountPercent { get; set; }
        }

        private static readonly System.Globalization.CultureInfo UsCulture = new System.Globalization.CultureInfo("en-US");

        static UrunSatisPdfOlusturucu()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static byte[] Olustur(
            string customerName,
            string quoteNo,
            List<ProductQuoteItemDto> items,
            string currency,
            string? notes = null,
            string? senderName = null)
        {
            Console.WriteLine($"\n[PRODUCT-PDF] ========== Product Quote PDF Generation Start ==========");
            Console.WriteLine($"[PRODUCT-PDF] Customer: {customerName}, Items: {items.Count}, QuoteNo: {quoteNo}, Currency: {currency}");

            // Calculate totals
            decimal subtotal = items.Sum(item =>
            {
                var netPrice = item.ListPrice * (1 - (item.DiscountPercent / 100m));
                return item.Quantity * netPrice;
            });

            decimal kdvOrani = 0.20m;
            decimal kdvTutar = Math.Round(subtotal * kdvOrani, 2);
            decimal grandTotal = Math.Round(subtotal + kdvTutar, 2);

            Console.WriteLine($"[PRODUCT-PDF] Subtotal: {subtotal}, VAT: {kdvTutar}, Total: {grandTotal}");

            string belgeTarihi = DateTime.Now.ToString("dd.MM.yyyy");

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);

                    // HEADER
                    page.Header().ShowOnce().Column(headerCol =>
                    {
                        var servicesFolder = System.IO.Path.Combine(AppContext.BaseDirectory, "Services");
                        var pngLogoPath = System.IO.Path.Combine(servicesFolder, "logo.png");

                        // Logo + Title Row
                        headerCol.Item().Row(row =>
                        {
                            row.ConstantItem(200).Height(80).Element(el =>
                            {
                                if (System.IO.File.Exists(pngLogoPath))
                                {
                                    el.Image(pngLogoPath).FitArea();
                                }
                            });

                            row.RelativeItem().AlignMiddle().AlignRight().Text("ÜRÜN LİSTE FİYAT TEKLİFİ")
                                .FontSize(20).Bold().FontColor("#D32F2F");
                        });

                        headerCol.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor("#D32F2F");
                    });

                    // FOOTER
                    page.Footer().AlignBottom().Element(containerFooter =>
                    {
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

                    // CONTENT
                    page.Content().PaddingBottom(15).Column(col =>
                    {
                        // Customer and Document Info Box
                        col.Item().Border(1).BorderColor("#E0E0E0").Padding(10).Column(infoCol =>
                        {
                            infoCol.Item().Row(row =>
                            {
                                row.RelativeItem().Text($"Sayın: {customerName}").FontSize(11).Bold();
                                row.ConstantItem(150).AlignRight().Text($"Tarih: {belgeTarihi}").FontSize(10);
                            });
                            infoCol.Item().PaddingTop(3).Row(row =>
                            {
                                row.RelativeItem().Text("").FontSize(10);
                                row.ConstantItem(150).AlignRight().Text($"Teklif No: {quoteNo}").FontSize(10);
                            });
                        });

                        col.Item().PaddingTop(15);

                        // Products Table
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(4);    // Ürün Adı
                                columns.RelativeColumn(1);    // Adet
                                columns.RelativeColumn(1.5f); // Liste Fiyatı
                                columns.RelativeColumn(1);    // İskonto %
                                columns.RelativeColumn(1.5f); // Net Fiyat
                            });

                            // Header Row
                            table.Header(header =>
                            {
                                header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                    .Padding(5).Text("Ürün Adı").FontSize(9).Bold();
                                header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                    .Padding(5).AlignCenter().Text("Adet").FontSize(9).Bold();
                                header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                    .Padding(5).AlignRight().Text("Liste Fiyatı").FontSize(9).Bold();
                                header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                    .Padding(5).AlignCenter().Text("İskonto %").FontSize(9).Bold();
                                header.Cell().Background("#E3F2FD").Border(0.5f).BorderColor("#90CAF9")
                                    .Padding(5).AlignRight().Text("Net Fiyat").FontSize(9).Bold();
                            });

                            // Product Rows
                            foreach (var item in items)
                            {
                                var netPrice = item.ListPrice * (1 - (item.DiscountPercent / 100m));
                                var lineTotal = item.Quantity * netPrice;

                                // Product Name (+ SKU if available)
                                table.Cell().Border(0.5f).BorderColor("#E0E0E0").Padding(5).Text(txt =>
                                {
                                    txt.Span(item.ProductName).FontSize(9);
                                    if (!string.IsNullOrWhiteSpace(item.SKU))
                                    {
                                        txt.Span($"\n({item.SKU})").FontSize(7).Italic().FontColor("#777");
                                    }
                                });

                                // Quantity
                                table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                    .Padding(5).AlignCenter().Text(item.Quantity.ToString()).FontSize(9);

                                // List Price
                                table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                    .Padding(5).AlignRight().Text(FormatCurrency(item.ListPrice, currency)).FontSize(9);

                                // Discount %
                                table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                    .Padding(5).AlignCenter().Text($"{item.DiscountPercent:0.##}%").FontSize(9);

                                // Net Price (total for line)
                                table.Cell().Border(0.5f).BorderColor("#E0E0E0")
                                    .Padding(5).AlignRight().Text(FormatCurrency(lineTotal, currency)).FontSize(9).Bold();
                            }
                        });

                        col.Item().PaddingTop(15);

                        // Subtotal Box
                        col.Item().Background("#E8F5E9").Border(1.5f).BorderColor("#4CAF50").Padding(12).Row(row =>
                        {
                            row.RelativeItem().Text("Ara Toplam").FontSize(13).Bold();
                            row.ConstantItem(150).AlignRight().Text(FormatCurrency(subtotal, currency))
                                .FontSize(14).Bold().FontColor("#2E7D32");
                        });

                        // Validity note
                        col.Item().PaddingTop(6).Text("Ürün Fiyat Teklifi — 30 gün geçerlidir.").FontSize(10).Italic();

                        // VAT Amount
                        col.Item().PaddingTop(6).Row(kdvRow =>
                        {
                            kdvRow.RelativeItem().Text($"KDV (%{(kdvOrani * 100):0}) Tutarı").FontSize(10);
                            kdvRow.ConstantItem(150).AlignRight().Text(FormatCurrency(kdvTutar, currency)).FontSize(10);
                        });

                        // Grand Total with VAT
                        col.Item().PaddingTop(6).Background("#FFF3E0").Border(1).BorderColor("#FFB74D").Padding(10).Row(row =>
                        {
                            row.RelativeItem().Text("KDV Dahil Toplam Tutar").FontSize(12).Bold();
                            row.ConstantItem(150).AlignRight().Text(FormatCurrency(grandTotal, currency))
                                .FontSize(12).Bold().FontColor("#BF360C");
                        });

                        // General Notes
                        if (!string.IsNullOrWhiteSpace(notes))
                        {
                            col.Item().PaddingTop(15).Border(1).BorderColor("#E0E0E0").Padding(10).Column(notCol =>
                            {
                                notCol.Item().Text("Genel Notlar:").FontSize(10).Bold();
                                notCol.Item().PaddingTop(3).Text(notes).FontSize(9);
                            });
                        }

                        // Signature Area
                        col.Item().PaddingTop(20).Row(row =>
                        {
                            row.RelativeItem().Column(leftCol =>
                            {
                                leftCol.Item().Text("Saygılarımızla,").FontSize(9);
                                var signName = string.IsNullOrWhiteSpace(senderName) ? "Keten Pnömatik" : senderName;
                                leftCol.Item().Text(signName).FontSize(9).Bold();
                            });
                        });

                        // Footer Image
                        var footerImagePath = System.IO.Path.Combine(AppContext.BaseDirectory, "Services", "footer.jpg");
                        if (System.IO.File.Exists(footerImagePath))
                        {
                            col.Item().PaddingTop(20).Height(60).Image(footerImagePath).FitWidth();
                        }
                    });
                });
            });

            Console.WriteLine($"[PRODUCT-PDF] ========== PDF Generation Complete ==========\n");
            return doc.GeneratePdf();
        }

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
