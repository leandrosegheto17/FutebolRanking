using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;
using GrupoFutebol.Domain.Interfaces;

namespace GrupoFutebol.Application.Services;

public class JogadorService(IJogadorRepository repository, IPresencaRodadaRepository presencaRepository)
{
    public async Task CadastrarAsync(CadastrarAtletaDto dto)
    {
        if (await repository.ExisteAsync(dto.Nome, dto.Telefone))
            throw new InvalidOperationException("Jogador já cadastrado com este nome e telefone.");

        var jogador = new Jogador(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.AdicionarAsync(jogador);
        await repository.SalvarAsync();
    }

    public async Task EditarAsync(int id, EditarAtletaDto dto)
    {
        var jogador = await repository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Jogador não encontrado.");

        if (await repository.ExisteAsync(dto.Nome, dto.Telefone, id))
            throw new InvalidOperationException("Já existe outro jogador com este nome e telefone.");

        jogador.Atualizar(dto.Nome, dto.DataNascimento, dto.Telefone, dto.PontuacaoInicial);
        await repository.SalvarAsync();
    }

    public async Task ExcluirAsync(int id)
    {
        var jogador = await repository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Jogador não encontrado.");

        await presencaRepository.RemoverPorAtletaAsync(id, TipoAtleta.Linha);
        await repository.RemoverAsync(jogador);
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

    public async Task<RankingPdfResponseDto> ObterRankingPdfAsync()
    {
        var jogadores = (await repository.ListarRankingAsync()).ToList();
        var presencas = await presencaRepository.ObterUltimasRodadasAsync(TipoAtleta.Linha, 5);

        var datas = presencas
            .Select(p => p.DataRodada)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        return new RankingPdfResponseDto
        {
            Datas = datas.Select(d => d.ToString("yyyy-MM-dd")).ToList(),
            Jogadores = jogadores.Select(j => new JogadorRankingPdfDto
            {
                Nome = j.Nome,
                PontuacaoInicial = j.PontuacaoInicial,
                PontuacaoAtual = j.PontuacaoAtual,
                Presencas = datas.Select(d =>
                    presencas.Any(p => p.AtletaId == j.Id && p.DataRodada == d && p.Presente)
                ).ToList()
            }).ToList()
        };
    }
}
