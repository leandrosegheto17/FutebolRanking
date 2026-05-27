using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GrupoFutebol.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "FutRanking");

            migrationBuilder.CreateTable(
                name: "Goleiros",
                schema: "FutRanking",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DataNascimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Telefone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PontuacaoInicial = table.Column<int>(type: "integer", nullable: false),
                    PontuacaoAtual = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Goleiros", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Jogadores",
                schema: "FutRanking",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DataNascimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Telefone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PontuacaoInicial = table.Column<int>(type: "integer", nullable: false),
                    PontuacaoAtual = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jogadores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PresencasRodada",
                schema: "FutRanking",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DataRodada = table.Column<DateOnly>(type: "date", nullable: false),
                    AtletaId = table.Column<int>(type: "integer", nullable: false),
                    TipoAtleta = table.Column<string>(type: "text", nullable: false),
                    Presente = table.Column<bool>(type: "boolean", nullable: false),
                    GolsMarcados = table.Column<int>(type: "integer", nullable: false),
                    CartaoAmarelo = table.Column<int>(type: "integer", nullable: false),
                    CartaoVermelho = table.Column<bool>(type: "boolean", nullable: false),
                    PontosGanhos = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresencasRodada", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Goleiros_Nome_Telefone",
                schema: "FutRanking",
                table: "Goleiros",
                columns: new[] { "Nome", "Telefone" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jogadores_Nome_Telefone",
                schema: "FutRanking",
                table: "Jogadores",
                columns: new[] { "Nome", "Telefone" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Goleiros",
                schema: "FutRanking");

            migrationBuilder.DropTable(
                name: "Jogadores",
                schema: "FutRanking");

            migrationBuilder.DropTable(
                name: "PresencasRodada",
                schema: "FutRanking");
        }
    }
}
