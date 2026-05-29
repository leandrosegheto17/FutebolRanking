using GrupoFutebol.Domain.Entities;

namespace GrupoFutebol.Domain.Interfaces;

public interface IGoleiroRepository
{
    Task<Goleiro?> ObterPorIdAsync(int id);
    Task<IEnumerable<Goleiro>> ListarRankingAsync();
    Task<bool> ExisteAsync(string nome, string telefone, int? excludeId = null);
    Task AdicionarAsync(Goleiro goleiro);
    Task RemoverAsync(Goleiro goleiro);
    Task SalvarAsync();
}
