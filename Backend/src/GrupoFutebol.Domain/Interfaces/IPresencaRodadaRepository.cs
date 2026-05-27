using GrupoFutebol.Domain.Entities;

namespace GrupoFutebol.Domain.Interfaces;

public interface IPresencaRodadaRepository
{
    Task AdicionarEmLoteAsync(IEnumerable<PresencaRodada> presencas);
    Task SalvarAsync();
}
