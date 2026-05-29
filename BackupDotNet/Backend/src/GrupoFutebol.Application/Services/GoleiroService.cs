using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;
using GrupoFutebol.Domain.Interfaces;

namespace GrupoFutebol.Application.Services;

public class GoleiroService(IGoleiroRepository repository, IPresencaRodadaRepository presencaRepository)
{
    public async Task CadastrarAsync(CadastrarAtletaDto dto)
    {
        if (await repository.ExisteAsync(dto.Nome, dto.Telefone))
            throw new InvalidOperationException("Goleiro já cadastrado com este nome e telefone.");

        var goleiro = new Goleiro(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.AdicionarAsync(goleiro);
        await repository.SalvarAsync();
    }

    public async Task EditarAsync(int id, EditarAtletaDto dto)
    {
        var goleiro = await repository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Goleiro não encontrado.");

        if (await repository.ExisteAsync(dto.Nome, dto.Telefone, id))
            throw new InvalidOperationException("Já existe outro goleiro com este nome e telefone.");

        goleiro.Atualizar(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.SalvarAsync();
    }

    public async Task ExcluirAsync(int id)
    {
        var goleiro = await repository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Goleiro não encontrado.");

        await presencaRepository.RemoverPorAtletaAsync(id, TipoAtleta.Goleiro);
        await repository.RemoverAsync(goleiro);
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
