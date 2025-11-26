using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using KetenErp.Core.Repositories;
using KetenErp.Core.Entities;
using System.Text.RegularExpressions;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StockImportController : ControllerBase
    {
        private readonly IProductRepository _productRepo;
        private readonly ISparePartRepository _sparePartRepo;

        public StockImportController(IProductRepository productRepo, ISparePartRepository sparePartRepo)
        {
            _productRepo = productRepo;
            _sparePartRepo = sparePartRepo;
        }

        // Parse stock strings coming from Excel. Handles formats like "11,00", "1.100,00", "1,100.00" etc.
        private int ParseStock(string? stockText)
        {
            if (string.IsNullOrWhiteSpace(stockText))
                return 0;

            stockText = stockText.Trim();
            decimal value;
            var styles = System.Globalization.NumberStyles.Number;

            // 1) Try invariant (dot as decimal)
            if (decimal.TryParse(stockText, styles, System.Globalization.CultureInfo.InvariantCulture, out value))
                return (int)Math.Round(value);

            // 2) Try Turkish (comma as decimal)
            try
            {
                var tr = new System.Globalization.CultureInfo("tr-TR");
                if (decimal.TryParse(stockText, styles, tr, out value))
                    return (int)Math.Round(value);
            }
            catch { }

            // 3) Clean non-digit except separators then retry
            var cleaned = System.Text.RegularExpressions.Regex.Replace(stockText, "[^\\d\\.,\\-]", "");
            if (decimal.TryParse(cleaned, styles, System.Globalization.CultureInfo.InvariantCulture, out value))
                return (int)Math.Round(value);
            try
            {
                var tr = new System.Globalization.CultureInfo("tr-TR");
                if (decimal.TryParse(cleaned, styles, tr, out value))
                    return (int)Math.Round(value);
            }
            catch { }

            // 4) Fallback - strip non-digits and parse as integer
            var digitsOnly = System.Text.RegularExpressions.Regex.Replace(stockText, "[^\\d\\-]", "");
            if (int.TryParse(digitsOnly, out int intVal))
                return intVal;

            return 0;
        }

        [HttpPost("products")]
        public async Task<IActionResult> ImportProducts(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Dosya yüklenmedi." });

            var fileName = file.FileName.ToLowerInvariant();
            if (!fileName.EndsWith(".xlsx") && !fileName.EndsWith(".xls"))
                return BadRequest(new { message = "Sadece .xlsx veya .xls dosyaları desteklenmektedir." });

            try
            {
                // Set EPPlus license context
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                var imported = 0;
                var updated = 0;
                var errors = new List<string>();

                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    stream.Position = 0;

                    using (var package = new ExcelPackage(stream))
                    {
                        if (package.Workbook.Worksheets.Count == 0)
                            return BadRequest(new { message = "Excel dosyasında sayfa bulunamadı." });

                        // Try to find a worksheet with data (check all worksheets)
                        ExcelWorksheet? worksheet = null;
                        foreach (var ws in package.Workbook.Worksheets)
                        {
                            if (ws.Dimension != null && ws.Dimension.Rows > 0)
                            {
                                worksheet = ws;
                                break;
                            }
                        }

                        if (worksheet == null)
                            return BadRequest(new { message = "Excel dosyasında veri bulunamadı." });

                        // Find header row (search first 5 rows for "Kart Kodu" or "SKU")
                        int headerRow = 0;
                        int skuCol = 0, descCol = 0, stockCol = 0;

                        for (int row = 1; row <= Math.Min(5, worksheet.Dimension.Rows); row++)
                        {
                            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                            {
                                var cellValue = worksheet.Cells[row, col].Text?.Trim() ?? "";
                                if (cellValue.Contains("Kart Kodu", StringComparison.OrdinalIgnoreCase) || 
                                    cellValue.Equals("SKU", StringComparison.OrdinalIgnoreCase))
                                {
                                    headerRow = row;
                                    skuCol = col;
                                }
                                else if (cellValue.Contains("Açıklama", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Başlık", StringComparison.OrdinalIgnoreCase))
                                {
                                    descCol = col;
                                }
                                else if (cellValue.Contains("Fiili Stok", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Stok", StringComparison.OrdinalIgnoreCase))
                                {
                                    stockCol = col;
                                }
                            }
                            if (headerRow > 0 && skuCol > 0) break;
                        }

                        if (headerRow == 0 || skuCol == 0)
                        {
                            errors.Add("Excel dosyasında 'Kart Kodu' sütunu bulunamadı.");
                            return BadRequest(new { message = "Geçersiz Excel formatı", errors });
                        }

                        // Process data rows
                        for (int row = headerRow + 1; row <= worksheet.Dimension.Rows; row++)
                        {
                            try
                            {
                                var sku = worksheet.Cells[row, skuCol].Text?.Trim();
                                if (string.IsNullOrWhiteSpace(sku)) continue;

                                var description = descCol > 0 ? worksheet.Cells[row, descCol].Text?.Trim() : "";
                                var stockText = stockCol > 0 ? worksheet.Cells[row, stockCol].Text?.Trim() : "0";
                                var stock = ParseStock(stockText);

                                // Check if product exists
                                var existingProducts = await _productRepo.GetAllAsync();
                                var existing = existingProducts.FirstOrDefault(p => 
                                    (p.SKU ?? "").Equals(sku, StringComparison.OrdinalIgnoreCase));

                                if (existing != null)
                                {
                                    // Update existing
                                    existing.Stock = stock;
                                    if (!string.IsNullOrWhiteSpace(description))
                                        existing.Name = description;
                                    await _productRepo.UpdateAsync(existing);
                                    updated++;
                                }
                                else
                                {
                                    // Create new
                                    var newProduct = new Product
                                    {
                                        SKU = sku,
                                        Name = description ?? sku,
                                        Description = description ?? "",
                                        Stock = stock,
                                        MinStock = 0,
                                        Price = 0m
                                    };
                                    await _productRepo.AddAsync(newProduct);
                                    imported++;
                                }
                            }
                            catch (Exception ex)
                            {
                                errors.Add($"Satır {row}: {ex.Message}");
                            }
                        }
                    }
                }

                return Ok(new 
                { 
                    message = "İçe aktarma tamamlandı",
                    imported,
                    updated,
                    errors = errors.Count > 0 ? errors : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "İçe aktarma hatası", error = ex.Message });
            }
        }

        [HttpPost("spareparts")]
        public async Task<IActionResult> ImportSpareParts(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Dosya yüklenmedi." });

            var fileName = file.FileName.ToLowerInvariant();
            if (!fileName.EndsWith(".xlsx") && !fileName.EndsWith(".xls"))
                return BadRequest(new { message = "Sadece .xlsx veya .xls dosyaları desteklenmektedir." });

            try
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                var imported = 0;
                var updated = 0;
                var errors = new List<string>();

                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    stream.Position = 0;

                    using (var package = new ExcelPackage(stream))
                    {
                        if (package.Workbook.Worksheets.Count == 0)
                            return BadRequest(new { message = "Excel dosyasında sayfa bulunamadı." });

                        // Try to find a worksheet with data (check all worksheets)
                        ExcelWorksheet? worksheet = null;
                        foreach (var ws in package.Workbook.Worksheets)
                        {
                            if (ws.Dimension != null && ws.Dimension.Rows > 0)
                            {
                                worksheet = ws;
                                break;
                            }
                        }

                        if (worksheet == null)
                            return BadRequest(new { message = "Excel dosyasında veri bulunamadı." });

                        // Find header row
                        int headerRow = 0;
                        int skuCol = 0, descCol = 0, stockCol = 0;

                        for (int row = 1; row <= Math.Min(5, worksheet.Dimension.Rows); row++)
                        {
                            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                            {
                                var cellValue = worksheet.Cells[row, col].Text?.Trim() ?? "";
                                if (cellValue.Contains("Kart Kodu", StringComparison.OrdinalIgnoreCase) || 
                                    cellValue.Equals("SKU", StringComparison.OrdinalIgnoreCase))
                                {
                                    headerRow = row;
                                    skuCol = col;
                                }
                                else if (cellValue.Contains("Açıklama", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Başlık", StringComparison.OrdinalIgnoreCase))
                                {
                                    descCol = col;
                                }
                                else if (cellValue.Contains("Fiili Stok", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Stok", StringComparison.OrdinalIgnoreCase))
                                {
                                    stockCol = col;
                                }
                            }
                            if (headerRow > 0 && skuCol > 0) break;
                        }

                        if (headerRow == 0 || (skuCol == 0 && descCol == 0))
                        {
                            errors.Add("Excel dosyasında 'Kart Kodu' veya 'Açıklama' sütunu bulunamadı.");
                            return BadRequest(new { message = "Geçersiz Excel formatı", errors });
                        }

                        // Get all products for matching
                        var allProducts = await _productRepo.GetAllAsync();

                        // Regex for Part Number Extraction (Existing)
                        // Matches: P/NO:16, P.NO: 12, PNO13D, PP.NO:33, P.NO:A4, PNO1-D
                        var partNoRegex = new Regex(@"(?i)(?:P|PP)(?:[\.\/\s-]*(?:NO|N)[\.:\s-]*)([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)?)|(?<![a-zA-Z])P(\d+[a-zA-Z]?)", RegexOptions.Compiled);
                        
                        // Regex for Product SKU Extraction (New)
                        // Matches patterns like AE-S600PF, 12-345, ABC-123
                        var skuRegex = new Regex(@"\b[A-Z0-9]+-[A-Z0-9]+\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);

                        // Process data rows
                        for (int row = headerRow + 1; row <= worksheet.Dimension.Rows; row++)
                        {
                            try
                            {
                                var kartKodu = skuCol > 0 ? worksheet.Cells[row, skuCol].Text?.Trim() : "";
                                var description = descCol > 0 ? worksheet.Cells[row, descCol].Text?.Trim() : "";
                                
                                if (string.IsNullOrWhiteSpace(kartKodu) && string.IsNullOrWhiteSpace(description)) continue;

                                var stockText = stockCol > 0 ? worksheet.Cells[row, stockCol].Text?.Trim() : "0";
                                var stock = ParseStock(stockText);

                                string partNumber = "";
                                string productSku = "";
                                Product? matchedProduct = null;

                                // 1. Try to extract Part Number from Description (P/NO logic)
                                var descMatch = partNoRegex.Match(description);
                                if (descMatch.Success)
                                {
                                    partNumber = !string.IsNullOrEmpty(descMatch.Groups[1].Value) 
                                        ? descMatch.Groups[1].Value 
                                        : descMatch.Groups[2].Value;
                                }

                                // 2. Try to extract Part Number from SKU (Kart Kodu)
                                if (!string.IsNullOrEmpty(kartKodu))
                                {
                                    var skuMatch = partNoRegex.Match(kartKodu);
                                    if (skuMatch.Success)
                                    {
                                        var pn = !string.IsNullOrEmpty(skuMatch.Groups[1].Value)
                                            ? skuMatch.Groups[1].Value
                                            : skuMatch.Groups[2].Value;
                                        
                                        if (string.IsNullOrEmpty(partNumber)) partNumber = pn;
                                    }
                                }

                                // 3. Try to extract Product SKU from Description (New Logic)
                                // Look for patterns like AE-S600PF anywhere in the description
                                var skuInDescMatch = skuRegex.Match(description);
                                string extractedSku = "";
                                if (skuInDescMatch.Success)
                                {
                                    extractedSku = skuInDescMatch.Value;
                                }

                                // 4. Determine Final Part Number
                                if (string.IsNullOrEmpty(partNumber))
                                {
                                    // If no P/NO found, use extracted SKU if available, otherwise KartKodu
                                    if (!string.IsNullOrEmpty(extractedSku))
                                    {
                                        // If we found a SKU in description but no P/NO, maybe the SKU is the part identifier?
                                        // Or we generate a part number? For now, let's use the extracted SKU as a fallback part number
                                        partNumber = extractedSku;
                                    }
                                    else if (!string.IsNullOrEmpty(kartKodu))
                                    {
                                        partNumber = kartKodu;
                                    }
                                    else
                                    {
                                        // Fallback if everything is missing (unlikely due to check above)
                                        partNumber = "UNKNOWN-" + Guid.NewGuid().ToString().Substring(0, 8);
                                    }
                                }
                                
                                // 5. Match Product
                                // Priority 1: Match by extracted SKU from description
                                if (!string.IsNullOrEmpty(extractedSku))
                                {
                                    var normalized = extractedSku.Replace("-", "").Replace(" ", "");
                                    matchedProduct = allProducts.FirstOrDefault(p => 
                                        (p.SKU ?? "").Replace("-", "").Replace(" ", "").Equals(normalized, StringComparison.OrdinalIgnoreCase));
                                }

                                // Priority 2: Match by KartKodu (if it looks like a product SKU)
                                if (matchedProduct == null && !string.IsNullOrEmpty(kartKodu))
                                {
                                    // Try exact match first
                                    matchedProduct = allProducts.FirstOrDefault(p => 
                                        (p.SKU ?? "").Equals(kartKodu, StringComparison.OrdinalIgnoreCase));
                                    
                                    // Try fuzzy match (stripping P/NO if present)
                                    if (matchedProduct == null && !string.IsNullOrEmpty(partNumber) && kartKodu.EndsWith(partNumber, StringComparison.OrdinalIgnoreCase))
                                    {
                                        var candidate = kartKodu.Substring(0, kartKodu.Length - partNumber.Length).Trim('-', ' ', '.');
                                        if (!string.IsNullOrEmpty(candidate))
                                        {
                                            matchedProduct = allProducts.FirstOrDefault(p => 
                                                (p.SKU ?? "").Equals(candidate, StringComparison.OrdinalIgnoreCase));
                                        }
                                    }
                                }

                                // Set final Product SKU string
                                if (matchedProduct != null)
                                {
                                    productSku = matchedProduct.SKU;
                                }
                                else
                                {
                                    productSku = !string.IsNullOrEmpty(extractedSku) ? extractedSku : (kartKodu ?? "");
                                }

                                // Check if spare part exists
                                var existingParts = await _sparePartRepo.GetAllAsync();
                                var existing = existingParts.FirstOrDefault(sp => 
                                    (sp.PartNumber ?? "").Equals(partNumber, StringComparison.OrdinalIgnoreCase) &&
                                    (matchedProduct == null || sp.ProductId == matchedProduct.Id));

                                if (existing != null)
                                {
                                    // Update existing
                                    existing.Stock = stock;
                                    if (!string.IsNullOrWhiteSpace(description))
                                        existing.Title = description;
                                    
                                    // If we found a better product match, update it? 
                                    // Maybe safer to only update if currently null
                                    if (existing.ProductId == null && matchedProduct != null)
                                    {
                                        existing.ProductId = matchedProduct.Id;
                                        existing.SKU = matchedProduct.SKU;
                                    }

                                    await _sparePartRepo.UpdateAsync(existing);
                                    updated++;
                                }
                                else
                                {
                                    // Create new spare part
                                    var newPart = new SparePart
                                    {
                                        SKU = matchedProduct?.SKU ?? productSku, // Use matched SKU or the extracted string
                                        PartNumber = partNumber,
                                        Title = !string.IsNullOrWhiteSpace(description) ? description : partNumber,
                                        ProductId = matchedProduct?.Id,
                                        Stock = stock,
                                        MinStock = 0
                                    };
                                    await _sparePartRepo.AddAsync(newPart);
                                    imported++;
                                }
                            }
                            catch (Exception ex)
                            {
                                errors.Add($"Satır {row}: {ex.Message}");
                            }
                        }
                    }
                }

                return Ok(new 
                { 
                    message = "Yedek parça içe aktarımı tamamlandı",
                    imported,
                    updated,
                    errors = errors.Count > 0 ? errors : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "İçe aktarma hatası", error = ex.Message });
            }
        }
    }
}
