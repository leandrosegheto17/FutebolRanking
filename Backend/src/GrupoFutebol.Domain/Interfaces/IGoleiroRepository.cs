using GrupoFutebol.Domain.Entities;

namespace GrupoFutebol.Domain.Interfaces;

public interface IGoleiroRepository
{
    Task<Goleiro?> ObterPorIdAsync(int id);
    Task<IEnumerable<Goleiro>> ListarRankingAsync();
    Task<bool> ExisteAsync(string nome, string telefone);
    Task AdicionarAsync(Goleiro goleiro);
    Task SalvarAsync();
}
