using KetenErp.Infrastructure.Data;
using KetenErp.Core.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly KetenErpDbContext _db;

        public CustomersController(KetenErpDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _db.Customers.OrderBy(c => c.Name).ToListAsync();
            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Customer model)
        {
            if (string.IsNullOrWhiteSpace(model.Name)) return BadRequest("Name required");
            if (string.IsNullOrWhiteSpace(model.Email)) model.Email = string.Empty;

            _db.Customers.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = model.Id }, model);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _db.Customers.FindAsync(id);
            if (item == null) return NotFound();
            _db.Customers.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("bulk-upload")]
        public async Task<IActionResult> BulkUpload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            var fileName = file.FileName.ToLowerInvariant();
            if (!fileName.EndsWith(".xlsx") && !fileName.EndsWith(".xls"))
                return BadRequest("Sadece .xlsx veya .xls dosyaları desteklenmektedir.");

            try
            {
                OfficeOpenXml.ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

                var added = 0;
                var skipped = 0;
                var errors = new List<string>();

                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    stream.Position = 0;

                    using (var package = new OfficeOpenXml.ExcelPackage(stream))
                    {
                        if (package.Workbook.Worksheets.Count == 0)
                            return BadRequest("Excel dosyasında sayfa bulunamadı.");

                        // Find first worksheet with data
                        OfficeOpenXml.ExcelWorksheet? worksheet = null;
                        foreach (var ws in package.Workbook.Worksheets)
                        {
                            if (ws.Dimension != null && ws.Dimension.Rows > 0)
                            {
                                worksheet = ws;
                                break;
                            }
                        }

                        if (worksheet == null)
                            return BadRequest("Excel dosyasında veri bulunamadı.");

                        // Find header row and columns
                        int headerRow = 0;
                        int nameCol = 0, emailCol = 0;

                        for (int row = 1; row <= Math.Min(5, worksheet.Dimension.Rows); row++)
                        {
                            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                            {
                                var cellValue = worksheet.Cells[row, col].Text?.Trim() ?? "";
                                if (cellValue.Contains("Müşteri", StringComparison.OrdinalIgnoreCase) ||
                                    cellValue.Contains("Ad", StringComparison.OrdinalIgnoreCase) ||
                                    cellValue.Contains("İsim", StringComparison.OrdinalIgnoreCase) ||
                                    cellValue.Contains("Name", StringComparison.OrdinalIgnoreCase))
                                {
                                    if (col == 1) // First column is usually the name
                                    {
                                        headerRow = row;
                                        nameCol = col;
                                    }
                                }
                                else if (cellValue.Contains("E-posta", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Email", StringComparison.OrdinalIgnoreCase) ||
                                         cellValue.Contains("Mail", StringComparison.OrdinalIgnoreCase))
                                {
                                    emailCol = col;
                                }
                            }
                            if (headerRow > 0 && nameCol > 0) break;
                        }

                        // If no header found, assume first row is header and columns are in order
                        if (headerRow == 0)
                        {
                            headerRow = 1;
                            nameCol = 1;
                            emailCol = worksheet.Dimension.Columns >= 2 ? 2 : 0;
                        }

                        // Process data rows
                        for (int row = headerRow + 1; row <= worksheet.Dimension.Rows; row++)
                        {
                            try
                            {
                                var name = worksheet.Cells[row, nameCol].Text?.Trim();
                                if (string.IsNullOrWhiteSpace(name)) continue;

                                var email = emailCol > 0 ? worksheet.Cells[row, emailCol].Text?.Trim() : "";

                                // Check if customer already exists
                                var exists = await _db.Customers.AnyAsync(c => c.Name.ToLower() == name.ToLower());
                                if (exists)
                                {
                                    skipped++;
                                    continue;
                                }

                                // Add customer
                                _db.Customers.Add(new Customer
                                {
                                    Name = name,
                                    Email = email ?? string.Empty
                                });
                                added++;
                            }
                            catch (Exception ex)
                            {
                                errors.Add($"Satır {row}: {ex.Message}");
                            }
                        }

                        await _db.SaveChangesAsync();
                    }
                }

                return Ok(new { added, skipped, errors });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error processing file", error = ex.Message });
            }
        }
    }
}
