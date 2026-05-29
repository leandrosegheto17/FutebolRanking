using System.ComponentModel.DataAnnotations;

namespace GrupoFutebol.Application.DTOs;

public class RegistrarRodadaDto
{
    [Required] public DateOnly DataRodada { get; set; }
    [Required] public List<PresencaAtletaDto> Presencas { get; set; } = [];
}

public class PresencaAtletaDto
{
    [Required] public int AtletaId { get; set; }
    [Required] public string TipoAtleta { get; set; } = string.Empty; // "Linha" ou "Goleiro"
    public bool Presente { get; set; }
    public int GolsMarcados { get; set; }
    public int CartaoAmarelo { get; set; }
    public bool CartaoVermelho { get; set; }
}
