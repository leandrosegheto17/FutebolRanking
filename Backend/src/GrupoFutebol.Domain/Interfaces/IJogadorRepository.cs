using GrupoFutebol.Domain.Entities;

namespace GrupoFutebol.Domain.Interfaces;

public interface IJogadorRepository
{
    Task<Jogador?> ObterPorIdAsync(int id);
    Task<IEnumerable<Jogador>> ListarRankingAsync();
    Task<bool> ExisteAsync(string nome, string telefone);
    Task AdicionarAsync(Jogador jogador);
    Task SalvarAsync();
}
