using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Repositories;

public class GoleiroRepository(AppDbContext context) : IGoleiroRepository
{
    public async Task<Goleiro?> ObterPorIdAsync(int id) =>
        await context.Goleiros.FindAsync(id);

    public async Task<IEnumerable<Goleiro>> ListarRankingAsync() =>
        await context.Goleiros
            .OrderByDescending(g => g.PontuacaoAtual)
            .ToListAsync();

    public async Task<bool> ExisteAsync(string nome, string telefone, int? excludeId = null) =>
        await context.Goleiros.AnyAsync(g =>
            g.Nome == nome && g.Telefone == telefone && (excludeId == null || g.Id != excludeId));

    public async Task AdicionarAsync(Goleiro goleiro) =>
        await context.Goleiros.AddAsync(goleiro);

    public Task RemoverAsync(Goleiro goleiro)
    {
        context.Goleiros.Remove(goleiro);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync() =>
        await context.SaveChangesAsync();
}
