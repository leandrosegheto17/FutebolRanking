using GrupoFutebol.Application.DTOs;
using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;
using GrupoFutebol.Domain.Interfaces;

namespace GrupoFutebol.Application.Services;

public class RodadaService(
    IJogadorRepository jogadorRepository,
    IGoleiroRepository goleiroRepository,
    IPresencaRodadaRepository presencaRepository)
{
    public async Task RegistrarRodadaAsync(RegistrarRodadaDto dto)
    {
        var presencas = new List<PresencaRodada>();

        foreach (var p in dto.Presencas)
        {
            var tipo = Enum.Parse<TipoAtleta>(p.TipoAtleta, ignoreCase: true);

            var presenca = new PresencaRodada(
                dto.DataRodada,
                p.AtletaId,
                tipo,
                p.Presente,
                p.GolsMarcados,
                p.CartaoAmarelo,
                p.CartaoVermelho);

            presencas.Add(presenca);

            if (tipo == TipoAtleta.Linha)
            {
                var jogador = await jogadorRepository.ObterPorIdAsync(p.AtletaId)
                    ?? throw new KeyNotFoundException($"Jogador {p.AtletaId} não encontrado.");
                jogador.AdicionarPontos(presenca.PontosGanhos);
            }
            else
            {
                var goleiro = await goleiroRepository.ObterPorIdAsync(p.AtletaId)
                    ?? throw new KeyNotFoundException($"Goleiro {p.AtletaId} não encontrado.");
                goleiro.AdicionarPontos(presenca.PontosGanhos);
            }
        }

        await presencaRepository.AdicionarEmLoteAsync(presencas);
        await jogadorRepository.SalvarAsync();
        await goleiroRepository.SalvarAsync();
        await presencaRepository.SalvarAsync();
    }
}
