using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Interfaces;

namespace GrupoFutebol.Application.Services;

public class JogadorService(IJogadorRepository repository)
{
    public async Task CadastrarAsync(CadastrarAtletaDto dto)
    {
        if (await repository.ExisteAsync(dto.Nome, dto.Telefone))
            throw new InvalidOperationException("Jogador já cadastrado com este nome e telefone.");

        var jogador = new Jogador(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.AdicionarAsync(jogador);
        await repository.SalvarAsync();
    }

    public async Task<IEnumerable<AtletaRankingDto>> ObterRankingAsync()
    {
        var jogadores = await repository.ListarRankingAsync();
        return jogadores.Select(j => new AtletaRankingDto
        {
            Id = j.Id,
            Nome = j.Nome,
            PontuacaoInicial = j.PontuacaoInicial,
            PontuacaoAtual = j.PontuacaoAtual
        });
    }
}
