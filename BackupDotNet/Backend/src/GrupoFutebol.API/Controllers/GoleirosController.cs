using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace GrupoFutebol.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GoleirosController(GoleiroService service) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarAtletaDto dto)
    {
        try
        {
            await service.CadastrarAsync(dto);
            return Created();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Editar(int id, [FromBody] EditarAtletaDto dto)
    {
        try
        {
            await service.EditarAsync(id, dto);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        try
        {
            await service.ExcluirAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
    }

    [HttpGet("ranking")]
    public async Task<IActionResult> Ranking()
    {
        var ranking = await service.ObterRankingAsync();
        return Ok(ranking);
    }
}
