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

    public async Task<bool> ExisteAsync(string nome, string telefone) =>
        await context.Goleiros.AnyAsync(g => g.Nome == nome && g.Telefone == telefone);

    public async Task AdicionarAsync(Goleiro goleiro) =>
        await context.Goleiros.AddAsync(goleiro);

    public async Task SalvarAsync() =>
        await context.SaveChangesAsync();
}
