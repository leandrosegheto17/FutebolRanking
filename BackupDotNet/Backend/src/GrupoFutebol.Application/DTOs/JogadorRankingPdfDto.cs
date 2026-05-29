namespace GrupoFutebol.Application.DTOs;

public class RankingPdfResponseDto
{
    public List<string> Datas { get; set; } = [];
    public List<JogadorRankingPdfDto> Jogadores { get; set; } = [];
}

public class JogadorRankingPdfDto
{
    public string Nome { get; set; } = string.Empty;
    public int PontuacaoInicial { get; set; }
    public int PontuacaoAtual { get; set; }
    public List<bool> Presencas { get; set; } = [];
}
