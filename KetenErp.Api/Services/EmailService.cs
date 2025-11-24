using System;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;
using KetenErp.Core.Entities;
using MimeKit;
using System.Text.RegularExpressions;
using System.Text;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace KetenErp.Api.Services
{
    public class DiagnosticResult
    {
        public bool TcpSuccess { get; set; }
        public string TcpError { get; set; } = string.Empty;
        public bool SslSuccess { get; set; }
        public string SslError { get; set; } = string.Empty;
        public bool AuthSuccess { get; set; }
        public string AuthError { get; set; } = string.Empty;
        public bool OverallSuccess { get; set; }
        public string Summary { get; set; } = string.Empty;
    }

    public class EmailService
    {
        /// <summary>
        /// Diagnose SMTP connection step-by-step: TCP, SSL, Auth.
        /// </summary>
        public async Task<DiagnosticResult> DiagnoseConnectionAsync(EmailAccount account)
        {
            var result = new DiagnosticResult();
            
            try
            {
                Console.WriteLine($"[EmailService] Starting diagnostics for {account.Name} ({account.Host}:{account.Port})");
                
                // Step 1: TCP connectivity
                Console.WriteLine($"[EmailService] Step 1: Testing TCP connection to {account.Host}:{account.Port}...");
                using var tcpClient = new TcpClient();
                try
                {
                    var connectTask = tcpClient.ConnectAsync(account.Host, account.Port);
                    var timeoutTask = Task.Delay(10000); // 10 second timeout for TCP
                    var completed = await Task.WhenAny(connectTask, timeoutTask);
                    
                    if (completed == timeoutTask)
                    {
                        result.TcpError = $"TCP bağlantısı 10 saniye içinde tamamlanamadı. Host/port yanlış veya güvenlik duvarı tarafından engellenmiş olabilir.";
                        Console.WriteLine($"[EmailService] {result.TcpError}");
                        result.Summary = result.TcpError;
                        return result;
                    }
                    
                    await connectTask; // propagate any exception
                    result.TcpSuccess = true;
                    Console.WriteLine($"[EmailService] ✓ TCP connection successful");
                }
                catch (Exception ex)
                {
                    result.TcpError = $"TCP bağlantısı başarısız: {ex.Message}";
                    Console.WriteLine($"[EmailService] ✗ {result.TcpError}");
                    result.Summary = result.TcpError;
                    return result;
                }
                
                // Step 2: SMTP SSL/TLS handshake
                Console.WriteLine($"[EmailService] Step 2: Testing SMTP SSL/TLS handshake...");
                using var client = new MailKit.Net.Smtp.SmtpClient();
                client.Timeout = 15000; // 15 seconds
                // If the SMTP provider returns a certificate whose name doesn't match the host
                // (common for some providers / custom certs), accept it to avoid connection drop.
                // NOTE: this disables hostname verification for SMTP TLS handshake.
                // NOTE: this disables hostname verification for SMTP TLS handshake.
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;
                client.CheckCertificateRevocation = false;
                
                SecureSocketOptions socketOptions = SecureSocketOptions.Auto;
                // Common patterns: port 465 = implicit SSL, port 587 = STARTTLS
                if (account.Port == 465)
                {
                    socketOptions = SecureSocketOptions.SslOnConnect;
                    Console.WriteLine($"[EmailService] Using SslOnConnect for port 465");
                }
                else if (account.Port == 587)
                {
                    socketOptions = SecureSocketOptions.StartTls;
                    Console.WriteLine($"[EmailService] Using StartTls for port 587");
                }
                else if (account.UseTls)
                {
                    socketOptions = SecureSocketOptions.StartTls;
                    Console.WriteLine($"[EmailService] Using StartTls (UseTls=true)");
                }
                else
                {
                    socketOptions = SecureSocketOptions.None;
                    Console.WriteLine($"[EmailService] Using no SSL/TLS (UseTls=false)");
                }
                
                try
                {
                    await client.ConnectAsync(account.Host, account.Port, socketOptions);
                    result.SslSuccess = true;
                    Console.WriteLine($"[EmailService] ✓ SMTP SSL/TLS handshake successful");
                }
                catch (Exception ex)
                {
                    result.SslError = $"SSL/TLS handshake başarısız: {ex.Message}";
                    Console.WriteLine($"[EmailService] ✗ {result.SslError}");
                    if (ex.InnerException != null)
                    {
                        result.SslError += $" (İç hata: {ex.InnerException.Message})";
                        Console.WriteLine($"[EmailService] Inner: {ex.InnerException.Message}");
                    }
                    result.Summary = result.SslError;
                    return result;
                }
                
                // Step 3: Authentication
                Console.WriteLine($"[EmailService] Step 3: Testing SMTP authentication...");
                string password = string.Empty;
                if (!string.IsNullOrEmpty(account.EncryptedPassword))
                {
                    try
                    {
                        var bytes = Convert.FromBase64String(account.EncryptedPassword);
                        password = System.Text.Encoding.UTF8.GetString(bytes);
                    }
                    catch
                    {
                        password = account.EncryptedPassword;
                    }
                }
                
                if (string.IsNullOrEmpty(password))
                {
                    result.AuthError = "Şifre ayarlanmamış.";
                    Console.WriteLine($"[EmailService] ✗ {result.AuthError}");
                    result.Summary = result.AuthError;
                    return result;
                }
                
                var user = account.UserName ?? account.FromAddress;
                try
                {
                    await client.AuthenticateAsync(user, password);
                    result.AuthSuccess = true;
                    Console.WriteLine($"[EmailService] ✓ SMTP authentication successful as {user}");
                }
                catch (Exception ex)
                {
                    result.AuthError = $"SMTP kimlik doğrulama başarısız: {ex.Message}";
                    Console.WriteLine($"[EmailService] ✗ {result.AuthError}");
                    if (ex.InnerException != null)
                    {
                        result.AuthError += $" (İç hata: {ex.InnerException.Message})";
                        Console.WriteLine($"[EmailService] Inner: {ex.InnerException.Message}");
                    }
                    result.Summary = result.AuthError;
                    return result;
                }
                
                await client.DisconnectAsync(true);
                
                result.OverallSuccess = true;
                result.Summary = "Tüm adımlar başarılı: TCP bağlantısı, SSL/TLS handshake ve kimlik doğrulama tamamlandı.";
                Console.WriteLine($"[EmailService] ✓ All diagnostics passed");
                return result;
            }
            catch (Exception ex)
            {
                result.Summary = $"Beklenmeyen hata: {ex.Message}";
                Console.WriteLine($"[EmailService] Diagnostic exception: {ex}");
                return result;
            }
        }

        /// <summary>
        /// Send an email with optional attachment using MailKit for robust SSL/TLS handling.
        /// </summary>
        public async Task<(bool Success, string Error)> SendEmailWithAttachmentAsync(EmailAccount account, string toEmail, string subject, string body, string attachmentPath)
        {
            // backward-compat wrapper for single recipient
            return await SendEmailWithAttachmentAsync(account, new[] { toEmail }, null, null, subject, body, attachmentPath, null);
        }

        /// <summary>
        /// Send email to multiple recipients with CC/BCC and optional sender name override.
        /// </summary>
        public async Task<(bool Success, string Error)> SendEmailWithAttachmentAsync(EmailAccount account, IEnumerable<string> toEmails, IEnumerable<string>? ccEmails, IEnumerable<string>? bccEmails, string subject, string body, string attachmentPath, string? senderName = null)
        {
            try
            {
                var toJoined = toEmails != null ? string.Join(';', toEmails) : "(none)";
                Console.WriteLine($"[EmailService] Attempting to send email to: {toJoined}");
                Console.WriteLine($"[EmailService] Using account: {account.Name} ({account.FromAddress})");
                Console.WriteLine($"[EmailService] SMTP Host: {account.Host}:{account.Port}, TLS: {account.UseTls}");

                // Decode password (base64) with a fallback to plain text
                string password = string.Empty;
                if (!string.IsNullOrEmpty(account.EncryptedPassword))
                {
                    try
                    {
                        var bytes = Convert.FromBase64String(account.EncryptedPassword);
                        password = System.Text.Encoding.UTF8.GetString(bytes);
                        Console.WriteLine($"[EmailService] Password decoded from base64");
                    }
                    catch
                    {
                        password = account.EncryptedPassword;
                        Console.WriteLine($"[EmailService] Using plain text password (not base64)");
                    }
                }
                else
                {
                    return (false, "E-posta hesabı şifresi ayarlanmamış.");
                }

                if (string.IsNullOrEmpty(password))
                {
                    return (false, "E-posta hesabı şifresi boş.");
                }

                var message = new MimeMessage();
                // Always use account display name for email header
                var displayName = string.IsNullOrWhiteSpace(account.Name) ? account.FromAddress : account.Name;
                message.From.Add(new MailboxAddress(displayName, account.FromAddress));
                if (toEmails != null)
                {
                    foreach (var t in toEmails)
                    {
                        if (!string.IsNullOrWhiteSpace(t)) message.To.Add(MailboxAddress.Parse(t));
                    }
                }
                if (ccEmails != null)
                {
                    foreach (var c in ccEmails)
                    {
                        if (!string.IsNullOrWhiteSpace(c)) message.Cc.Add(MailboxAddress.Parse(c));
                    }
                }
                if (bccEmails != null)
                {
                    foreach (var b in bccEmails)
                    {
                        if (!string.IsNullOrWhiteSpace(b)) message.Bcc.Add(MailboxAddress.Parse(b));
                    }
                }
                message.Subject = subject;

                var builder = new BodyBuilder();

                // Helper to find image path (checks for .png then .jpg)
                string findImagePath(string name) {
                    var basePath = Path.Combine(AppContext.BaseDirectory, "Services");
                    var pngPath = Path.Combine(basePath, $"{name}.png");
                    if (File.Exists(pngPath)) return pngPath;
                    var jpgPath = Path.Combine(basePath, $"{name}.jpg");
                    if (File.Exists(jpgPath)) return jpgPath;
                    return string.Empty;
                }

                // Helper to embed an image and return its CID
                string embedImage(string imageName)
                {
                    var imagePath = findImagePath(imageName);
                    if (string.IsNullOrEmpty(imagePath))
                    {
                        Console.WriteLine($"[EmailService] Embedding failed: Image '{imageName}' not found.");
                        return string.Empty;
                    }
                    try
                    {
                        var image = builder.LinkedResources.Add(imagePath);
                        image.ContentId = MimeKit.Utils.MimeUtils.GenerateMessageId(); // Unique CID
                        image.ContentDisposition = new MimeKit.ContentDisposition(MimeKit.ContentDisposition.Inline);
                        image.ContentDisposition.FileName = null; // CRITICAL: Prevents appearing as an attachment
                        Console.WriteLine($"[EmailService] Embedded '{imageName}' with CID: {image.ContentId}");
                        return image.ContentId;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[EmailService] ERROR embedding '{imageName}': {ex.Message}");
                        return string.Empty;
                    }
                }

                // Embed all images required for the signature
                string logoCid = embedImage("logo");
                string footerCid = embedImage("mail_footer");
                string katalogCid = embedImage("katalog");
                string youtubeCid = embedImage("youtube");
                string instagramCid = embedImage("instagram");
                string facebookCid = embedImage("facebook");
                string websiteCid = embedImage("website");
                string linkedinCid = embedImage("linkedin");

                // Attach PDF if present
                if (!string.IsNullOrEmpty(attachmentPath) && File.Exists(attachmentPath))
                {
                    builder.Attachments.Add(attachmentPath);
                    Console.WriteLine($"[EmailService] Attached PDF: {attachmentPath}");
                }
                else
                {
                    Console.WriteLine($"[EmailService] Warning: No attachment found at {attachmentPath}");
                }

                // Build email HTML template based on Adsız.htm structure
                string? finalHtml = null;
                
                var sb = new StringBuilder();
                sb.AppendLine("<!DOCTYPE html>");
                sb.AppendLine("<html>");
                sb.AppendLine("<head>");
                sb.AppendLine("<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>");
                sb.AppendLine("<style>");
                sb.AppendLine("body { font-family: Calibri, sans-serif; font-size: 11pt; margin: 0; padding: 20px; }");
                sb.AppendLine("p { margin: 0 0 10pt 0; }");
                sb.AppendLine("a { color: #0563C1; text-decoration: underline; }");
                sb.AppendLine(".signature { font-size: 12pt; }");
                sb.AppendLine(".company-name { font-size: 15pt; font-weight: bold; color: #C0504D; }");
                sb.AppendLine(".contact-info { font-size: 12pt; color: black; }");
                sb.AppendLine(".social-icons { margin-top: 10px; }");
                sb.AppendLine(".social-icons a { margin-right: 5px; }");
                sb.AppendLine("</style>");
                sb.AppendLine("</head>");
                sb.AppendLine("<body>");
                
                // Email content
                sb.AppendLine("<p class='signature' style='margin-bottom:6pt;'>Merhabalar,</p>");
                sb.AppendLine("<p class='signature' style='margin-bottom:6pt;'>Tamir fiyat teklifimiz ekli dosyadadır.</p>");
                sb.AppendLine("<p class='signature' style='margin-bottom:10pt;'>Teklifimizin olumlu sonuçlanmasını umar, çalışmalarınızda başarılar dileriz.</p>");
                
                // Signature - use senderName override if provided, otherwise default to "Keten Pnömatik Teknik Ekibi"
                var signatureName = !string.IsNullOrWhiteSpace(senderName) ? senderName : "Keten Pnömatik Teknik Ekibi";
                sb.AppendLine("<p class='signature' style='margin-bottom:4pt;'>Best Regards - Saygılarımızla,</p>");
                sb.AppendLine($"<p class='signature' style='margin-bottom:12pt;'><strong>{signatureName}</strong></p>");
                
                // Build block from logo onward to match Adsız.htm structure (images use cid:)
                // Header small image (logo/header)
                if (!string.IsNullOrEmpty(logoCid))
                {
                    sb.AppendLine($"<p style='margin:0;padding:0;'><img width='406' height='33' src='cid:{logoCid}' alt='header' style='display:block;margin:0;padding:0;' /></p>");
                }

                // Company name (large)
                sb.AppendLine("<p style='font-size:15.0pt;color:#C0504D;font-weight:bold;margin:6pt 0;'>Havalı ve Elektrikli Endüstriyel Montaj Ekipmanları</p>");

                // Contact information with proper alignment using table
                sb.AppendLine("<table border='0' cellpadding='0' cellspacing='0' style='font-size:12pt;color:black;margin:4pt 0;'>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'><strong>Merkez</strong>&nbsp;&nbsp;&nbsp;</td>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'>: O.Yılmaz Mah.&nbsp; M. Akif Ersoy Cad.&nbsp; No:52 Gebze / <strong>KOCAELİ</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;* Tel:&nbsp;+90 262 643 43 39 pbx.&nbsp; *E-Posta : <a href='mailto:info@ketenpnomatik.com.tr' style='color:#467886;'>info@ketenpnomatik.com.tr</a></td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'><strong>Şube</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'>: 75.yıl Mah. 5307 Sok. No:17/A&nbsp; Yunusemre / <strong>MANİSA</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;* Tel:&nbsp;+90 236 236 41 45 pbx.&nbsp; *E-Posta : <a href='mailto:manisa@ketenpnomatik.com.tr' style='color:#467886;'>manisa@ketenpnomatik.com.tr</a></td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'><strong>Gsm</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'>: <strong><u>+90 541 452 60 58</u></strong></td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'><strong>E-Posta</strong>&nbsp;&nbsp;&nbsp;&nbsp;</td>");
                sb.AppendLine("<td style='padding:2pt 0;vertical-align:top;'>: <a href='mailto:teknik@ketenpnomatik.com.tr' style='color:#467886;'>teknik@ketenpnomatik.com.tr</a></td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='padding:2pt 0 8pt 0;vertical-align:top;'><strong>Web</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>");
                sb.AppendLine("<td style='padding:2pt 0 8pt 0;vertical-align:top;'>: <a href='http://www.ketenpnomatik.com.tr' style='color:#467886;'>http://www.ketenpnomatik.com.tr</a></td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("</table>");

                // Large banner (use footerCid for the big banner image from template)
                if (!string.IsNullOrEmpty(footerCid))
                {
                    sb.AppendLine($"<p style='margin:6pt 0;'><img border='0' width='964' height='99' src='cid:{footerCid}' alt='banner' style='display:block;width:100%;height:auto;border:0;margin:0;padding:0;' /></p>");
                }

                // Catalog + "28 Yıllık" + social icons aligned next to catalog
                sb.AppendLine("<table border='0' cellpadding='0' cellspacing='0' style='width:100%;margin-top:8pt;'>");
                sb.AppendLine("<tr>");
                sb.AppendLine("<td style='vertical-align:top;width:200px;padding-right:16px;'>");
                if (!string.IsNullOrEmpty(katalogCid))
                {
                    sb.AppendLine($"<a href='https://www.ketenpnomatik.com.tr/wp-content/uploads/KATALOG-2025.pdf'><img src='cid:{katalogCid}' alt='Katalog' style='display:block;max-width:200px;height:auto;border:0;' /></a>");
                }
                sb.AppendLine("</td>");
                sb.AppendLine("<td style='vertical-align:middle;padding-left:0;'>");
                sb.AppendLine("<p style='font-size:15pt;font-weight:bold;color:#525252;margin:0 0 8pt 0;'>28 Yıllık Tecrübe ve Deneyim ...!</p>");

                // Social icons in same column, inline
                sb.AppendLine("<p style='margin:0;line-height:0;'>");
                if (!string.IsNullOrEmpty(youtubeCid)) sb.AppendLine($"<a href='https://www.youtube.com/@Keten.Pnomatik' style='margin-right:8px;display:inline-block;'><img src='cid:{youtubeCid}' alt='YouTube' style='width:35px;height:auto;border:0;vertical-align:middle;' /></a>");
                if (!string.IsNullOrEmpty(instagramCid)) sb.AppendLine($"<a href='https://www.instagram.com/ketenpnomatik/' style='margin-right:8px;display:inline-block;'><img src='cid:{instagramCid}' alt='Instagram' style='width:32px;height:auto;border:0;vertical-align:middle;' /></a>");
                if (!string.IsNullOrEmpty(facebookCid)) sb.AppendLine($"<a href='https://www.facebook.com/ketenpnomatik/' style='margin-right:8px;display:inline-block;'><img src='cid:{facebookCid}' alt='Facebook' style='width:35px;height:auto;border:0;vertical-align:middle;' /></a>");
                if (!string.IsNullOrEmpty(websiteCid)) sb.AppendLine($"<a href='https://www.ketenpnomatik.com.tr/' style='margin-right:8px;display:inline-block;'><img src='cid:{websiteCid}' alt='Website' style='width:35px;height:auto;border:0;vertical-align:middle;' /></a>");
                if (!string.IsNullOrEmpty(linkedinCid)) sb.AppendLine($"<a href='https://www.linkedin.com/company/keten-pn%C3%B6matik-haval%C4%B1-el-aletleri-otomasyon-sanayi-ve-ticaret-ltd-%C5%9Fti/about/' style='margin-right:8px;display:inline-block;'><img src='cid:{linkedinCid}' alt='LinkedIn' style='width:35px;height:auto;border:0;vertical-align:middle;' /></a>");
                sb.AppendLine("</p>");

                sb.AppendLine("</td>");
                sb.AppendLine("</tr>");
                sb.AppendLine("</table>");
                
                sb.AppendLine("</body>");
                sb.AppendLine("</html>");
                
                finalHtml = sb.ToString();

                builder.HtmlBody = finalHtml;
                message.Body = builder.ToMessageBody();

                using var client = new MailKit.Net.Smtp.SmtpClient();

                // Configure connect timeout and handshake behavior
                client.Timeout = 30000; // 30 seconds

                // Accept server certificate even if the hostname doesn't match the certificate.
                // This prevents connection aborts when server certificate CN/SAN doesn't match.
                // This prevents connection aborts when server certificate CN/SAN doesn't match.
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;
                client.CheckCertificateRevocation = false;

                // Choose the appropriate SecureSocketOptions - same logic as DiagnoseConnectionAsync
                SecureSocketOptions socketOptions = SecureSocketOptions.Auto;
                if (account.Port == 465)
                {
                    socketOptions = SecureSocketOptions.SslOnConnect;
                    Console.WriteLine($"[EmailService] Using SslOnConnect for port 465");
                }
                else if (account.Port == 587)
                {
                    socketOptions = SecureSocketOptions.StartTls;
                    Console.WriteLine($"[EmailService] Using StartTls for port 587");
                }
                else if (account.UseTls)
                {
                    socketOptions = SecureSocketOptions.StartTls;
                    Console.WriteLine($"[EmailService] Using StartTls (UseTls=true)");
                }
                else
                {
                    socketOptions = SecureSocketOptions.None;
                    Console.WriteLine($"[EmailService] Using no SSL/TLS (UseTls=false)");
                }

                Console.WriteLine($"[EmailService] Connecting to SMTP server...");
                await client.ConnectAsync(account.Host, account.Port, socketOptions);

                // Authenticate
                if (!string.IsNullOrEmpty(account.UserName) || !string.IsNullOrEmpty(account.FromAddress))
                {
                    var user = account.UserName ?? account.FromAddress;
                    Console.WriteLine($"[EmailService] Authenticating as {user}...");
                    await client.AuthenticateAsync(user, password);
                }

                Console.WriteLine($"[EmailService] Sending email...");
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                Console.WriteLine($"[EmailService] Email sent successfully to {toJoined}");
                return (true, string.Empty);
            }
            catch (Exception ex)
            {
                var errorMsg = $"E-mail gönderme hatası: {ex.Message}";
                Console.WriteLine($"[EmailService] ERROR: {errorMsg}");
                Console.WriteLine($"[EmailService] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[EmailService] Inner exception: {ex.InnerException.Message}");
                }
                return (false, errorMsg);
            }
        }
    }
}
