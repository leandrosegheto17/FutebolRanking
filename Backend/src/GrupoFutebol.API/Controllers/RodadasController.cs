using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace GrupoFutebol.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RodadasController(RodadaService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] RegistrarRodadaDto dto)
    {
        try
        {
            await service.RegistrarRodadaAsync(dto);
            return Created();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }
}
