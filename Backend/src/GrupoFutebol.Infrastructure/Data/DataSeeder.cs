using GrupoFutebol.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GrupoFutebol.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Jogadores.AnyAsync()) return;

        var jogadores = new List<Jogador>
        {
            new("Lionel Messi",           new DateOnly(1987,  6, 24), "00000000000", 289),
            new("Cristiano Ronaldo",      new DateOnly(1985,  2,  5), "00000000001", 245),
            new("Neymar Jr",              new DateOnly(1992,  2,  5), "00000000002", 198),
            new("Kylian Mbappé",          new DateOnly(1998, 12, 20), "00000000003", 267),
            new("Erling Haaland",         new DateOnly(2000,  7, 21), "00000000004", 300),
            new("Vinicius Junior",        new DateOnly(2000,  7, 12), "00000000005", 201),
            new("Rodrygo",               new DateOnly(2001,  1,  9), "00000000006", 145),
            new("Pedri",                 new DateOnly(2002, 11, 25), "00000000007", 178),
            new("Lamine Yamal",          new DateOnly(2007,  7, 16), "00000000008",  88),
            new("Gavi",                  new DateOnly(2004,  8,  5), "00000000009", 156),
            new("Kevin De Bruyne",       new DateOnly(1991,  6, 28), "00000000010", 223),
            new("Mohamed Salah",         new DateOnly(1992,  6, 15), "00000000011", 256),
            new("Sadio Mané",            new DateOnly(1992,  4, 10), "00000000012", 189),
            new("Roberto Firmino",       new DateOnly(1991, 10,  2), "00000000013", 167),
            new("Karim Benzema",         new DateOnly(1987, 12, 19), "00000000014", 234),
            new("Antoine Griezmann",     new DateOnly(1991,  3, 21), "00000000015", 212),
            new("Lautaro Martinez",      new DateOnly(1997,  8, 22), "00000000016", 176),
            new("Paulo Dybala",          new DateOnly(1993, 11, 15), "00000000017", 143),
            new("Romelu Lukaku",         new DateOnly(1993,  5, 13), "00000000018", 112),
            new("Marcus Rashford",       new DateOnly(1997, 10, 31), "00000000019",  89),
            new("Jadon Sancho",          new DateOnly(2000,  3, 25), "00000000020",  67),
            new("Phil Foden",            new DateOnly(2000,  5, 28), "00000000021", 201),
            new("Jack Grealish",         new DateOnly(1995,  9, 10), "00000000022", 145),
            new("Declan Rice",           new DateOnly(1999,  1, 14), "00000000023", 167),
            new("Jude Bellingham",       new DateOnly(2003,  6, 29), "00000000024", 290),
            new("Bukayo Saka",           new DateOnly(2001,  9,  5), "00000000025", 234),
            new("Harry Kane",            new DateOnly(1993,  7, 28), "00000000026", 278),
            new("Son Heung-min",         new DateOnly(1992,  7,  8), "00000000027", 212),
            new("Richarlison",           new DateOnly(1997,  5, 10), "00000000028", 134),
            new("Raphinha",              new DateOnly(1996, 12, 14), "00000000029", 156),
            new("Casemiro",              new DateOnly(1992,  2, 23), "00000000030", 189),
            new("Thiago Silva",          new DateOnly(1984,  9, 22), "00000000031", 223),
            new("Marquinhos",            new DateOnly(1994,  5, 14), "00000000032", 198),
            new("Eder Militao",          new DateOnly(1998,  1, 18), "00000000033", 167),
            new("Lucas Paqueta",         new DateOnly(1997,  8, 27), "00000000034", 145),
            new("Bruno Fernandes",       new DateOnly(1994,  9,  8), "00000000035", 212),
            new("Ruben Dias",            new DateOnly(1997,  5, 14), "00000000036", 134),
            new("Virgil van Dijk",       new DateOnly(1991,  7,  8), "00000000037", 189),
            new("Trent Alexander-Arnold",new DateOnly(1998, 10,  7), "00000000038", 156),
            new("Frenkie de Jong",       new DateOnly(1997,  5, 12), "00000000039", 134),
        };

        await context.Jogadores.AddRangeAsync(jogadores);

        var goleiros = new List<Goleiro>
        {
            new("Alisson Becker",        new DateOnly(1992, 10,  2), "00000000040", 234),
            new("Ederson",               new DateOnly(1993,  8, 17), "00000000041", 198),
            new("Manuel Neuer",          new DateOnly(1986,  3, 27), "00000000042", 267),
            new("Jan Oblak",             new DateOnly(1993,  1,  7), "00000000043", 189),
            new("Thibaut Courtois",      new DateOnly(1992,  5, 11), "00000000044", 245),
            new("Hugo Lloris",           new DateOnly(1986, 12, 26), "00000000045", 156),
            new("Keylor Navas",          new DateOnly(1986, 12, 15), "00000000046", 178),
            new("Marc-André ter Stegen", new DateOnly(1992,  4, 30), "00000000047", 212),
            new("David De Gea",          new DateOnly(1990, 11,  7), "00000000048", 134),
            new("Gianluigi Donnarumma", new DateOnly(1999,  2, 25), "00000000049", 201),
        };

        await context.Goleiros.AddRangeAsync(goleiros);
        await context.SaveChangesAsync();
    }
}
