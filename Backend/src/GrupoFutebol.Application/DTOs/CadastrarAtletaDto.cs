using System.ComponentModel.DataAnnotations;

namespace GrupoFutebol.Application.DTOs;

public class CadastrarAtletaDto
{
    [Required] public string Nome { get; set; } = string.Empty;
    [Required] public DateOnly DataNascimento { get; set; }
    [Required] public string Telefone { get; set; } = string.Empty;
    public int PontuacaoInicial { get; set; } = 0;
}
