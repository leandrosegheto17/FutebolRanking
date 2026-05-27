using GrupoFutebol.Application.Services;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;
using GrupoFutebol.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, _, _) =>
    {
        doc.Info.Title   = "Futebol Ranking API";
        doc.Info.Version = "v1";
        doc.Info.Description = "API para controle de presença, estatísticas e ranking do grupo de futebol.";
        return Task.CompletedTask;
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IJogadorRepository, JogadorRepository>();
builder.Services.AddScoped<IGoleiroRepository, GoleiroRepository>();
builder.Services.AddScoped<IPresencaRodadaRepository, PresencaRodadaRepository>();

builder.Services.AddScoped<JogadorService>();
builder.Services.AddScoped<GoleiroService>();
builder.Services.AddScoped<RodadaService>();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options.Title  = "Futebol Ranking API";
    options.Theme  = ScalarTheme.DeepSpace;
    options.DefaultHttpClient = new(ScalarTarget.Http, ScalarClient.Http11);
});

app.UseCors();
app.UseHttpsRedirection();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DataSeeder.SeedAsync(db);
}

app.Run();
