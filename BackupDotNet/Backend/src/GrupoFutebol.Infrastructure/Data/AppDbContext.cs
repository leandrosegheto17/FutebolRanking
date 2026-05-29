using GrupoFutebol.Domain.Entities;
using GrupoFutebol.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Jogador> Jogadores => Set<Jogador>();
    public DbSet<Goleiro> Goleiros => Set<Goleiro>();
    public DbSet<PresencaRodada> PresencasRodada => Set<PresencaRodada>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("FutRanking");

        modelBuilder.Entity<Jogador>(e =>
        {
            e.HasKey(j => j.Id);
            e.Property(j => j.Nome).IsRequired().HasMaxLength(100);
            e.Property(j => j.Telefone).IsRequired().HasMaxLength(20);
            e.HasIndex(j => new { j.Nome, j.Telefone }).IsUnique();
        });

        modelBuilder.Entity<Goleiro>(e =>
        {
            e.HasKey(g => g.Id);
            e.Property(g => g.Nome).IsRequired().HasMaxLength(100);
            e.Property(g => g.Telefone).IsRequired().HasMaxLength(20);
            e.HasIndex(g => new { g.Nome, g.Telefone }).IsUnique();
        });

        modelBuilder.Entity<PresencaRodada>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.TipoAtleta).HasConversion<string>();
        });
    }
}
