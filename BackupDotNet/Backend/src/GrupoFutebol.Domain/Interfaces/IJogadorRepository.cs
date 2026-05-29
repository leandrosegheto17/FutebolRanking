using GrupoFutebol.Domain.Entities;

namespace GrupoFutebol.Domain.Interfaces;

public interface IJogadorRepository
{
    Task<Jogador?> ObterPorIdAsync(int id);
    Task<IEnumerable<Jogador>> ListarRankingAsync();
    Task<bool> ExisteAsync(string nome, string telefone, int? excludeId = null);
    Task AdicionarAsync(Jogador jogador);
    Task RemoverAsync(Jogador jogador);
    Task SalvarAsync();
}
