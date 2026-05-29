using GrupoFutebol.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await SeedJogadoresAsync(context);
        await SeedGoleirosAsync(context);
    }

    private static async Task SeedJogadoresAsync(AppDbContext context)
    {
        if (await context.Jogadores.AnyAsync()) return;

        var jogadores = new List<Jogador>
        {
            new("Jacaré",       new DateOnly(1990, 1, 1), "00000000000", 725),
            new("Domingos",     new DateOnly(1990, 1, 1), "00000000001", 705),
            new("Gustavo",      new DateOnly(1990, 1, 1), "00000000002", 677),
            new("Leandro",      new DateOnly(1990, 1, 1), "00000000003", 665),
            new("Renato",       new DateOnly(1990, 1, 1), "00000000004", 652),
            new("Alex",         new DateOnly(1990, 1, 1), "00000000005", 647),
            new("Bira",         new DateOnly(1990, 1, 1), "00000000006", 646),
            new("Boró",         new DateOnly(1990, 1, 1), "00000000007", 638),
            new("Carvalho",     new DateOnly(1990, 1, 1), "00000000008", 629),
            new("Moysés",       new DateOnly(1990, 1, 1), "00000000009", 624),
            new("Luciano",      new DateOnly(1990, 1, 1), "00000000010", 619),
            new("Alcir",        new DateOnly(1990, 1, 1), "00000000011", 617),
            new("Mineiro",      new DateOnly(1990, 1, 1), "00000000012", 615),
            new("Elízio",       new DateOnly(1990, 1, 1), "00000000013", 609),
            new("Charles",      new DateOnly(1990, 1, 1), "00000000014", 607),
            new("Nem",          new DateOnly(1990, 1, 1), "00000000015", 602),
            new("Matheus",      new DateOnly(1990, 1, 1), "00000000016", 600),
            new("Tuninho",      new DateOnly(1990, 1, 1), "00000000017", 588),
            new("Dentinho",     new DateOnly(1990, 1, 1), "00000000018", 581),
            new("Bideu",        new DateOnly(1990, 1, 1), "00000000019", 580),
            new("Ribeiro",      new DateOnly(1990, 1, 1), "00000000020", 577),
            new("Esmario",      new DateOnly(1990, 1, 1), "00000000021", 574),
            new("Jorge",        new DateOnly(1990, 1, 1), "00000000022", 569),
            new("Breder",       new DateOnly(1990, 1, 1), "00000000023", 555),
            new("Duduzinho",    new DateOnly(1990, 1, 1), "00000000024", 544),
            new("Bruno",        new DateOnly(1990, 1, 1), "00000000025", 542),
            new("Adão",         new DateOnly(1990, 1, 1), "00000000026", 529),
            new("Felipe",       new DateOnly(1990, 1, 1), "00000000027", 425),
            new("Waguinho",     new DateOnly(1990, 1, 1), "00000000028", 399),
            new("Vagner Neves", new DateOnly(1990, 1, 1), "00000000029", 393),
            new("Sarney",       new DateOnly(1990, 1, 1), "00000000030", 375),
            new("Victor",       new DateOnly(1990, 1, 1), "00000000031", 298),
            new("Marcão",       new DateOnly(1990, 1, 1), "00000000032", 189),
            new("Áureo",        new DateOnly(1990, 1, 1), "00000000033", 141),
            new("Pablo",        new DateOnly(1990, 1, 1), "00000000034", 117),
            new("PA",           new DateOnly(1990, 1, 1), "00000000035",  96),
            new("Marcelo",      new DateOnly(1990, 1, 1), "00000000036",  93),
            new("Dudu",         new DateOnly(1990, 1, 1), "00000000037",  84),
            new("Maurinho",     new DateOnly(1990, 1, 1), "00000000038",  81),
            new("Rodrigo",      new DateOnly(1990, 1, 1), "00000000039",  60),
            new("Jeferson",     new DateOnly(1990, 1, 1), "00000000040",  39),
            new("João Gabriel", new DateOnly(1990, 1, 1), "00000000041",   0),
        };

        await context.Jogadores.AddRangeAsync(jogadores);
        await context.SaveChangesAsync();
    }

    private static async Task SeedGoleirosAsync(AppDbContext context)
    {
        if (await context.Goleiros.AnyAsync()) return;

        var goleiros = new List<Goleiro>
        {
            new("Alisson Becker",        new DateOnly(1992, 10,  2), "00000000050", 234),
            new("Ederson",               new DateOnly(1993,  8, 17), "00000000051", 198),
            new("Manuel Neuer",          new DateOnly(1986,  3, 27), "00000000052", 267),
            new("Jan Oblak",             new DateOnly(1993,  1,  7), "00000000053", 189),
            new("Thibaut Courtois",      new DateOnly(1992,  5, 11), "00000000054", 245),
            new("Hugo Lloris",           new DateOnly(1986, 12, 26), "00000000055", 156),
            new("Keylor Navas",          new DateOnly(1986, 12, 15), "00000000056", 178),
            new("Marc-André ter Stegen", new DateOnly(1992,  4, 30), "00000000057", 212),
            new("David De Gea",          new DateOnly(1990, 11,  7), "00000000058", 134),
            new("Gianluigi Donnarumma",  new DateOnly(1999,  2, 25), "00000000059", 201),
        };

        await context.Goleiros.AddRangeAsync(goleiros);
        await context.SaveChangesAsync();
    }
}
