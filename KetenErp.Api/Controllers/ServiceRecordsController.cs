using KetenErp.Core.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.EntityFrameworkCore;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // allow muhasebe role to view records as well
    [Authorize(Roles = "servis,admin,muhasebe")]
    public class ServiceRecordsController : ControllerBase
    {
        private readonly IServiceRecordRepository _repo;
        private readonly KetenErp.Infrastructure.Data.KetenErpDbContext _db;

        // Static memory to track which record is waiting for photos (simple signal system)
        private static int? _waitingRecordId = null;
        private static DateTime? _waitingTimestamp = null;
        private static readonly object _lock = new object();

    [Microsoft.Extensions.DependencyInjection.ActivatorUtilitiesConstructor]
    public ServiceRecordsController(IServiceRecordRepository repo, KetenErp.Infrastructure.Data.KetenErpDbContext db) => (_repo, _db) = (repo, db);

    // Signal that a record is waiting for photos (mobile photo upload flow)
    [HttpPost("{id:int}/signal")]
    public async Task<IActionResult> SignalWaitingForPhotos(int id)
    {
        var record = await _repo.GetByIdAsync(id);
        if (record == null) return NotFound();
        
        lock (_lock)
        {
            _waitingRecordId = id;
            _waitingTimestamp = DateTime.UtcNow;
        }
        
        return Ok(new { message = "Record is now waiting for photos", recordId = id, belgeNo = record.BelgeNo });
    }

    // Get the record currently waiting for photos (for mobile photo page)
    [AllowAnonymous]
    [HttpGet("waiting")]
    public async Task<IActionResult> GetWaitingRecord()
    {
        int? recordId;
        DateTime? timestamp;
        
        lock (_lock)
        {
            recordId = _waitingRecordId;
            timestamp = _waitingTimestamp;
        }
        
        if (!recordId.HasValue)
        {
            return Ok(new { waiting = false, message = "No record is waiting for photos" });
        }
        
        // Optional: timeout after 30 minutes
        if (timestamp.HasValue && (DateTime.UtcNow - timestamp.Value).TotalMinutes > 30)
        {
            lock (_lock)
            {
                _waitingRecordId = null;
                _waitingTimestamp = null;
            }
            return Ok(new { waiting = false, message = "Signal expired (timeout)" });
        }
        
        var record = await _repo.GetByIdAsync(recordId.Value);
        if (record == null)
        {
            lock (_lock)
            {
                _waitingRecordId = null;
                _waitingTimestamp = null;
            }
            return Ok(new { waiting = false, message = "Record not found" });
        }
        
        return Ok(new 
        { 
            waiting = true, 
            recordId = record.Id, 
            belgeNo = record.BelgeNo, 
            servisTakipNo = record.ServisTakipNo, 
            firmaIsmi = record.FirmaIsmi,
            urunModeli = record.UrunModeli 
        });
    }

    // Return next auto-generated BelgeNo in format KTNTS-01, KTNTS-02, ...
    [AllowAnonymous]
    [HttpGet("nextbelgeno")]
        public async Task<IActionResult> GetNextBelgeNo()
        {
            var all = await _repo.GetAllAsync();
            var prefix = "KTNTS-";
            int max = 0;
            foreach (var r in all)
            {
                if (string.IsNullOrWhiteSpace(r.BelgeNo)) continue;
                if (!r.BelgeNo.StartsWith(prefix)) continue;
                var digits = r.BelgeNo.Substring(prefix.Length);
                // strip non-digits
                var numStr = new string(digits.Where(char.IsDigit).ToArray());
                if (int.TryParse(numStr, out var n))
                {
                    if (n > max) max = n;
                }
            }

            var next = max + 1;
            var nextStr = prefix + next.ToString("D2");
            return Ok(new { BelgeNo = nextStr });
        }

    // Return next auto-generated ServisTakipNo in format SRV-0001, SRV-0002, ...
    [AllowAnonymous]
    [HttpGet("nexttakipno")]
        public async Task<IActionResult> GetNextTakipNo()
        {
            var all = await _repo.GetAllAsync();
            var prefix = "SRV-";
            int max = 0;
            foreach (var r in all)
            {
                if (string.IsNullOrWhiteSpace(r.ServisTakipNo)) continue;
                if (!r.ServisTakipNo.StartsWith(prefix)) continue;
                var digits = r.ServisTakipNo.Substring(prefix.Length);
                // strip non-digits
                var numStr = new string(digits.Where(char.IsDigit).ToArray());
                if (int.TryParse(numStr, out var n))
                {
                    if (n > max) max = n;
                }
            }

            var next = max + 1;
            var nextStr = prefix + next.ToString("D4");
            return Ok(new { ServisTakipNo = nextStr });
        }

        // List photos for a service record
        // Allow anonymous access so mobile/photo upload flow can view uploaded images
        [AllowAnonymous]
        [HttpGet("{id:int}/photos")]
        public async Task<IActionResult> GetPhotos(int id)
        {
            var photos = await _db.ServiceRecordPhotos.Where(p => p.ServiceRecordId == id).OrderByDescending(p => p.CreatedAt).ToListAsync();
            var baseUrl = "";
            try { baseUrl = Request.Scheme + "://" + Request.Host.Host; } catch { baseUrl = ""; }

            var result = photos.Select(p =>
            {
                var fp = (p.FilePath ?? string.Empty).Replace('\\', '/');
                // If the stored path includes 'wwwroot/', strip that portion for the public URL
                var virtualPath = fp;
                var idx = fp.IndexOf("wwwroot/", StringComparison.OrdinalIgnoreCase);
                if (idx >= 0)
                {
                    virtualPath = fp.Substring(idx + "wwwroot/".Length);
                }
                // If stored path contains 'uploads/' but not 'wwwroot/', ensure we use the uploads portion
                if (!virtualPath.Contains("uploads/") && fp.Contains("uploads/"))
                {
                    var uidx = fp.IndexOf("uploads/", StringComparison.OrdinalIgnoreCase);
                    if (uidx >= 0) virtualPath = fp.Substring(uidx);
                }
                virtualPath = virtualPath.TrimStart('/');
                var url = string.IsNullOrWhiteSpace(virtualPath) ? null : (baseUrl + "/" + virtualPath);
                return new { p.Id, Url = url, p.CreatedAt };
            }).ToList();

            return Ok(result);
        }

        // Upload one or more photos for a service record
        [HttpPost("{id:int}/photos")]
        [AllowAnonymous]
        public async Task<IActionResult> UploadPhotos(int id)
        {
            // Allow anonymous uploads only when a "waiting for photos" signal exists for this record
            var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;
            if (!isAuthenticated)
            {
                int? waitingId;
                DateTime? waitingTs;
                lock (_lock)
                {
                    waitingId = _waitingRecordId;
                    waitingTs = _waitingTimestamp;
                }

                if (!waitingId.HasValue || waitingId.Value != id)
                {
                    return Unauthorized();
                }

                if (waitingTs.HasValue && (DateTime.UtcNow - waitingTs.Value).TotalMinutes > 30)
                {
                    // signal expired
                    return Unauthorized(new { message = "Upload session expired" });
                }
            }

            var record = await _repo.GetByIdAsync(id);
            if (record == null) return NotFound();

            var files = Request.Form.Files;
            if (files == null || files.Count == 0) return BadRequest("No files uploaded");

            // Belge No'ya göre klasör oluştur - eğer belge no yoksa id kullan
            var folderName = !string.IsNullOrWhiteSpace(record.BelgeNo) ? record.BelgeNo : id.ToString();
            var uploadsDir = Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads", folderName);
            if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

            var saved = new List<object>();
            foreach (var f in files)
            {
                try
                {
                    var ext = Path.GetExtension(f.FileName);
                    var fname = Guid.NewGuid().ToString("N") + ext;
                    var fp = Path.Combine(uploadsDir, fname);
                    using (var fs = System.IO.File.Create(fp))
                    {
                        await f.CopyToAsync(fs);
                    }

                    var relative = Path.GetRelativePath(AppContext.BaseDirectory, fp).Replace('\\','/');
                    var photo = new KetenErp.Core.Service.ServiceRecordPhoto 
                    { 
                        ServiceRecordId = id, 
                        BelgeNo = record.BelgeNo,
                        FileName = fname, 
                        FilePath = relative, 
                        CreatedAt = DateTime.UtcNow 
                    };
                    _db.ServiceRecordPhotos.Add(photo);
                    await _db.SaveChangesAsync();
                    var url = Request.Scheme + "://" + Request.Host.Host + "/" + relative.Replace('\\','/');
                    saved.Add(new { photo.Id, Url = url });
                }
                catch (Exception ex)
                {
                    // ignore individual file errors, continue
                    Console.WriteLine("Photo save error: " + ex.Message);
                }
            }

            // Clear waiting signal after successful upload (photo session complete)
            lock (_lock)
            {
                if (_waitingRecordId == id)
                {
                    _waitingRecordId = null;
                    _waitingTimestamp = null;
                }
            }

            return Ok(new { saved });
        }

        // Delete a single photo by id (also removes file from disk)
        [HttpDelete("{id:int}/photos/{photoId:int}")]
        public async Task<IActionResult> DeletePhoto(int id, int photoId)
        {
            var photo = await _db.ServiceRecordPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.ServiceRecordId == id);
            if (photo == null) return NotFound();

            try
            {
                var fp = (photo.FilePath ?? string.Empty).Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
                // If stored as relative path, make absolute
                string abs = fp;
                if (!Path.IsPathRooted(fp)) abs = Path.Combine(AppContext.BaseDirectory, fp.TrimStart(Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(abs))
                {
                    System.IO.File.Delete(abs);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error deleting photo file: " + ex.Message);
            }

            _db.ServiceRecordPhotos.Remove(photo);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());

        // List archived/completed service records
        [HttpGet("completed")]
        public async Task<IActionResult> GetCompleted()
        {
            // If the table is not present yet, return empty list instead of throwing
            try
            {
                // Just return empty list if table doesn't exist (handled by try-catch)
                // For PostgreSQL/EF Core, we can just try to query.
                var list = await _db.CompletedServiceRecords.OrderByDescending(c => c.CompletedAt).ToListAsync();
                return Ok(list);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        // Get detailed information about an archived/completed service record
        // This returns the archived snapshot (serialized JSON) plus related sent-quote info
        [HttpGet("completed/{archiveId:int}/details")]
        public async Task<IActionResult> GetCompletedDetails(int archiveId)
        {
            var archive = await _db.CompletedServiceRecords.FindAsync(archiveId);
            if (archive == null) return NotFound();

            // Find SentQuotes that reference the original service record id (ServiceRecordIds stored as CSV)
            var allQuotes = await _db.SentQuotes.ToListAsync();
            var matched = new List<object>();
            if (archive.OriginalServiceRecordId.HasValue)
            {
                var orig = archive.OriginalServiceRecordId.Value.ToString();
                foreach (var q in allQuotes)
                {
                    if (string.IsNullOrWhiteSpace(q.ServiceRecordIds)) continue;
                    var parts = q.ServiceRecordIds.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(p => p.Trim());
                    if (parts.Contains(orig))
                    {
                        matched.Add(new { q.Id, q.RecipientEmail, q.BelgeNo, q.PdfFileName, q.SentAt, q.CustomerName });
                    }
                }
            }

            // Return archive metadata + matched quotes + the serialized JSON string for the frontend to parse
            var result = new
            {
                archive.Id,
                archive.OriginalServiceRecordId,
                archive.BelgeNo,
                archive.ServisTakipNo,
                archive.FirmaIsmi,
                archive.UrunModeli,
                archive.GelisTarihi,
                archive.CompletedAt,
                QuotesCount = matched.Count,
                Quotes = matched,
                SerializedRecordJson = archive.SerializedRecordJson
            };

            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var r = await _repo.GetByIdAsync(id);
            if (r == null) return NotFound();
            return Ok(r);
        }

        [HttpPost]
        public async Task<IActionResult> Create(ServiceRecord dto)
        {
            // validate durum value - default to Kayıt Açıldı for new records
            try { if (!ServiceRecordStatus.IsValid(dto.Durum)) dto.Durum = ServiceRecordStatus.KayitAcildi; } catch { dto.Durum = ServiceRecordStatus.KayitAcildi; }
            // if BelgeNo not provided, auto-generate next one
            if (string.IsNullOrWhiteSpace(dto.BelgeNo))
            {
                var nb = await GetNextBelgeNo();
                if (nb is OkObjectResult ok && ok.Value != null)
                {
                    var val = ok.Value as dynamic;
                    dto.BelgeNo = val?.BelgeNo;
                }
            }
            // if ServisTakipNo not provided, auto-generate next one
            if (string.IsNullOrWhiteSpace(dto.ServisTakipNo))
            {
                var nt = await GetNextTakipNo();
                if (nt is OkObjectResult ok && ok.Value != null)
                {
                    var val = ok.Value as dynamic;
                    dto.ServisTakipNo = val?.ServisTakipNo;
                }
            }
            var created = await _repo.AddAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, ServiceRecord dto)
        {
            if (id != dto.Id) return BadRequest();

            // Normalize status variants (frontend sometimes sends 'Tamamlandi' without Turkish char)
            string incomingStatus = (dto.Durum ?? string.Empty).Trim();
            if (string.Equals(incomingStatus, "Tamamlandi", StringComparison.OrdinalIgnoreCase)) incomingStatus = ServiceRecordStatus.Tamamlandi;

            // If the new status is completed, archive the record into CompletedServiceRecords
            if (string.Equals(incomingStatus, ServiceRecordStatus.Tamamlandi, StringComparison.Ordinal))
            {
                // load full record (includes operations via repository)
                var existing = await _repo.GetByIdAsync(id);
                if (existing == null) return NotFound();

                // Load related child collections that repository may not include
                var operations = await _db.ServiceOperations.Where(o => o.ServiceRecordId == id)
                                            .Include(o => o.ChangedParts)
                                            .Include(o => o.ServiceItems)
                                            .ToListAsync();

                var photos = await _db.ServiceRecordPhotos.Where(p => p.ServiceRecordId == id).ToListAsync();

                // Build a serializable snapshot containing all details but avoid EF navigation cycles
                var recordDto = new
                {
                    existing.Id,
                    existing.ServisTakipNo,
                    existing.UrunModeli,
                    existing.FirmaIsmi,
                    existing.GelisTarihi,
                    existing.Durum,
                    existing.BelgeNo,
                    existing.AlanKisi,
                    existing.Notlar
                };

                var opsDto = operations.Select(o => new
                {
                    o.Id,
                    o.ServiceRecordId,
                    o.IslemBitisTarihi,
                    o.YapanKisi,
                    ChangedParts = o.ChangedParts.Select(cp => new { cp.Id, cp.PartName, cp.Quantity, cp.Price, cp.ListPrice, cp.DiscountPercent }).ToList(),
                    ServiceItems = o.ServiceItems.Select(si => new { si.Id, si.Name, si.Price, si.ListPrice, si.DiscountPercent }).ToList()
                }).ToList();

                var photosDto = photos.Select(p => new { p.Id, p.BelgeNo, p.FileName, p.FilePath, p.CreatedAt }).ToList();

                var snapshot = new { Record = recordDto, Operations = opsDto, Photos = photosDto };

                string json = System.Text.Json.JsonSerializer.Serialize(snapshot, new System.Text.Json.JsonSerializerOptions { WriteIndented = false, PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

                var archive = new KetenErp.Core.Service.CompletedServiceRecord
                {
                    OriginalServiceRecordId = existing.Id,
                    BelgeNo = existing.BelgeNo,
                    ServisTakipNo = existing.ServisTakipNo,
                    FirmaIsmi = existing.FirmaIsmi,
                    UrunModeli = existing.UrunModeli,
                    GelisTarihi = existing.GelisTarihi,
                    CompletedAt = DateTime.UtcNow,
                    SerializedRecordJson = json
                };

                // For PostgreSQL, we'll skip the manual table check and rely on EF.
                // If the table doesn't exist, the transaction below will fail, which is handled.
                // However, to be safe and match the logic of "mark as completed if archive fails":


                // perform deletion of child entities and add archive inside a transaction
                using (var tx = await _db.Database.BeginTransactionAsync())
                {
                    try
                    {
                        _db.CompletedServiceRecords.Add(archive);
                        await _db.SaveChangesAsync();

                        // Remove child entities (changed parts, service items are included via operations)
                        var opIds = operations.Select(o => o.Id).ToList();
                        if (opIds.Any())
                        {
                            var changed = _db.ChangedParts.Where(cp => opIds.Contains(cp.ServiceOperationId));
                            _db.ChangedParts.RemoveRange(changed);

                            var items = _db.ServiceItems.Where(si => opIds.Contains(si.ServiceOperationId));
                            _db.ServiceItems.RemoveRange(items);

                            var opsToRemove = _db.ServiceOperations.Where(o => o.ServiceRecordId == id);
                            _db.ServiceOperations.RemoveRange(opsToRemove);
                        }

                        // remove photos
                        var phs = _db.ServiceRecordPhotos.Where(p => p.ServiceRecordId == id);
                        _db.ServiceRecordPhotos.RemoveRange(phs);

                        // finally remove the active record
                        var r = await _db.ServiceRecords.FindAsync(id);
                        if (r != null) _db.ServiceRecords.Remove(r);

                        await _db.SaveChangesAsync();

                        await tx.CommitAsync();
                    }
                    catch (Exception ex)
                    {
                        await tx.RollbackAsync();
                        // Log full exception including inner exceptions and stack for diagnosis
                        Console.WriteLine("Error archiving record: " + ex.ToString());
                        // Return full exception text in detail to help debugging locally (remove in production)
                        return StatusCode(500, new { message = "Could not archive record", detail = ex.ToString() });
                    }
                }

                return Ok(new { archived = true, archiveId = archive.Id });
            }

            // validate durum on update - default to Kayıt Açıldı if invalid
            try { if (!ServiceRecordStatus.IsValid(incomingStatus)) dto.Durum = ServiceRecordStatus.KayitAcildi; else dto.Durum = incomingStatus; } catch { dto.Durum = ServiceRecordStatus.KayitAcildi; }
            var updated = await _repo.UpdateAsync(dto);
            return Ok(updated);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _repo.DeleteAsync(id);
            return NoContent();
        }
    }
}
