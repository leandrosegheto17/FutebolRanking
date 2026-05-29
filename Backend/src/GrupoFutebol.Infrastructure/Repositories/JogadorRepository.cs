using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Repositories;

public class JogadorRepository(AppDbContext context) : IJogadorRepository
{
    public async Task<Jogador?> ObterPorIdAsync(int id) =>
        await context.Jogadores.FindAsync(id);

    public async Task<IEnumerable<Jogador>> ListarRankingAsync() =>
        await context.Jogadores
            .OrderByDescending(j => j.PontuacaoAtual)
            .ToListAsync();

    public async Task<bool> ExisteAsync(string nome, string telefone, int? excludeId = null) =>
        await context.Jogadores.AnyAsync(j =>
            j.Nome == nome && j.Telefone == telefone && (excludeId == null || j.Id != excludeId));

    public async Task AdicionarAsync(Jogador jogador) =>
        await context.Jogadores.AddAsync(jogador);

    public Task RemoverAsync(Jogador jogador)
    {
        context.Jogadores.Remove(jogador);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync() =>
        await context.SaveChangesAsync();
}
