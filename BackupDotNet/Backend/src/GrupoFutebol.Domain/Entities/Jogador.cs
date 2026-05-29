namespace GrupoFutebol.Domain.Entities;

public class Jogador
{
    public int Id { get; private set; }
    public string Nome { get; private set; } = string.Empty;
    public DateOnly DataNascimento { get; private set; }
    public string Telefone { get; private set; } = string.Empty;
    public int PontuacaoInicial { get; private set; }
    public int PontuacaoAtual { get; private set; }

    protected Jogador() { }

    public Jogador(string nome, DateOnly dataNascimento, string telefone, int pontuacaoInicial = 0)
    {
        Nome = nome;
        DataNascimento = dataNascimento;
        Telefone = telefone;
        PontuacaoInicial = pontuacaoInicial;
        PontuacaoAtual = pontuacaoInicial;
    }

    public void AdicionarPontos(int pontos)
    {
        PontuacaoAtual += pontos;
    }

    public void Atualizar(string nome, DateOnly dataNascimento, string telefone, int pontuacaoInicial)
    {
        var delta = pontuacaoInicial - PontuacaoInicial;
        Nome = nome;
        DataNascimento = dataNascimento;
        Telefone = telefone;
        PontuacaoInicial = pontuacaoInicial;
        PontuacaoAtual += delta;
    }
}
