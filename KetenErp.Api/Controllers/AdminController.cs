using KetenErp.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace KetenErp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminController(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        // List all users
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userManager.Users.ToListAsync();
            var result = new List<object>();
            
            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                result.Add(new 
                { 
                    u.Id, 
                    u.UserName, 
                    u.Email, 
                    u.FullName, 
                    Roles = roles 
                });
            }
            
            return Ok(result);
        }

        // Create a new user
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser(CreateUserDto dto)
        {
            if (await _userManager.FindByNameAsync(dto.UserName) != null)
                return BadRequest("Username already exists");

            var user = new ApplicationUser 
            { 
                UserName = dto.UserName, 
                Email = dto.Email, 
                FullName = dto.FullName 
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded) return BadRequest(result.Errors);

            if (!string.IsNullOrEmpty(dto.Role))
            {
                await _userManager.AddToRoleAsync(user, dto.Role);
            }

            return Ok(new { user.Id, user.UserName });
        }

        // Delete a user
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Prevent deleting yourself
            if (User.Identity?.Name == user.UserName)
                return BadRequest("You cannot delete your own account");

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded) return BadRequest(result.Errors);

            return NoContent();
        }

        // Reset password
        [HttpPost("users/{id}/password")]
        public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            
            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok(new { message = "Password reset successfully" });
        }

        public record CreateUserDto(string UserName, string Email, string Password, string Role, string FullName);
        public record ResetPasswordDto(string NewPassword);
    }
}
