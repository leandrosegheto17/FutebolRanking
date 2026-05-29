using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;

namespace GrupoFutebol.Domain.Interfaces;

public interface IPresencaRodadaRepository
{
    Task AdicionarEmLoteAsync(IEnumerable<PresencaRodada> presencas);
    Task<List<PresencaRodada>> ObterUltimasRodadasAsync(TipoAtleta tipo, int quantidade);
    Task RemoverPorAtletaAsync(int atletaId, TipoAtleta tipo);
    Task SalvarAsync();
}
