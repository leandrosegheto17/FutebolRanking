using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Interfaces;

namespace GrupoFutebol.Application.Services;

public class GoleiroService(IGoleiroRepository repository)
{
    public async Task CadastrarAsync(CadastrarAtletaDto dto)
    {
        if (await repository.ExisteAsync(dto.Nome, dto.Telefone))
            throw new InvalidOperationException("Goleiro já cadastrado com este nome e telefone.");

        var goleiro = new Goleiro(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.AdicionarAsync(goleiro);
        await repository.SalvarAsync();
    }

    public async Task<IEnumerable<AtletaRankingDto>> ObterRankingAsync()
    {
        var goleiros = await repository.ListarRankingAsync();
        return goleiros.Select(g => new AtletaRankingDto
        {
            Id = g.Id,
            Nome = g.Nome,
            PontuacaoInicial = g.PontuacaoInicial,
            PontuacaoAtual = g.PontuacaoAtual
        });
    }
}
