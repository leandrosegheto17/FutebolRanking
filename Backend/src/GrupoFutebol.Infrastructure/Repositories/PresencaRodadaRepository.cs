using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;

namespace GrupoFutebol.Infrastructure.Repositories;

public class PresencaRodadaRepository(AppDbContext context) : IPresencaRodadaRepository
{
    public async Task AdicionarEmLoteAsync(IEnumerable<PresencaRodada> presencas) =>
        await context.PresencasRodada.AddRangeAsync(presencas);

    public async Task SalvarAsync() =>
        await context.SaveChangesAsync();
}
