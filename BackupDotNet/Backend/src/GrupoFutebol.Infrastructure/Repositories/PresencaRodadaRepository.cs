using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Repositories;

public class PresencaRodadaRepository(AppDbContext context) : IPresencaRodadaRepository
{
    public async Task AdicionarEmLoteAsync(IEnumerable<PresencaRodada> presencas) =>
        await context.PresencasRodada.AddRangeAsync(presencas);

    public async Task<List<PresencaRodada>> ObterUltimasRodadasAsync(TipoAtleta tipo, int quantidade)
    {
        var ultimasDatas = await context.PresencasRodada
            .Where(p => p.TipoAtleta == tipo)
            .Select(p => p.DataRodada)
            .Distinct()
            .OrderByDescending(d => d)
            .Take(quantidade)
            .ToListAsync();

        if (ultimasDatas.Count == 0) return [];

        return await context.PresencasRodada
            .Where(p => p.TipoAtleta == tipo && ultimasDatas.Contains(p.DataRodada))
            .ToListAsync();
    }

    public async Task RemoverPorAtletaAsync(int atletaId, TipoAtleta tipo)
    {
        var presencas = await context.PresencasRodada
            .Where(p => p.AtletaId == atletaId && p.TipoAtleta == tipo)
            .ToListAsync();
        context.PresencasRodada.RemoveRange(presencas);
    }

    public async Task SalvarAsync() =>
        await context.SaveChangesAsync();
}
