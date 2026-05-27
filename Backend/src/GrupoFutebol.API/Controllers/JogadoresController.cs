using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace GrupoFutebol.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JogadoresController(JogadorService service) : ControllerBase
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

    [HttpGet("ranking")]
    public async Task<IActionResult> Ranking()
    {
        var ranking = await service.ObterRankingAsync();
        return Ok(ranking);
    }

    [HttpGet("ranking-pdf")]
    public async Task<IActionResult> RankingPdf()
    {
        var resultado = await service.ObterRankingPdfAsync();
        return Ok(resultado);
    }
}
