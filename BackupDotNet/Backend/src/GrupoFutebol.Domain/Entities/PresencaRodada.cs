using GrupoFutebol.Domain.Enums;

namespace GrupoFutebol.Domain.Entities;

public class PresencaRodada
{
    public int Id { get; private set; }
    public DateOnly DataRodada { get; private set; }
    public int AtletaId { get; private set; }
    public TipoAtleta TipoAtleta { get; private set; }
    public bool Presente { get; private set; }
    public int GolsMarcados { get; private set; }
    public int CartaoAmarelo { get; private set; }
    public bool CartaoVermelho { get; private set; }
    public int PontosGanhos { get; private set; }

    protected PresencaRodada() { }

    public PresencaRodada(
        DateOnly dataRodada,
        int atletaId,
        TipoAtleta tipoAtleta,
        bool presente,
        int golsMarcados,
        int cartaoAmarelo,
        bool cartaoVermelho)
    {
        DataRodada = dataRodada;
        AtletaId = atletaId;
        TipoAtleta = tipoAtleta;
        Presente = presente;
        GolsMarcados = golsMarcados;
        CartaoAmarelo = cartaoAmarelo;
        CartaoVermelho = cartaoVermelho;
        PontosGanhos = CalcularPontos(presente, cartaoVermelho);
    }

    private static int CalcularPontos(bool presente, bool cartaoVermelho)
    {
        if (!presente) return 0;
        return cartaoVermelho ? 2 : 3;
    }
}
