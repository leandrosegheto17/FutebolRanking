namespace GrupoFutebol.Application.DTOs;

public class AtletaRankingDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int PontuacaoInicial { get; set; }
    public int PontuacaoAtual { get; set; }
}
