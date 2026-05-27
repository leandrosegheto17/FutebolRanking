using GrupoFutebol.Application.Services;
using GrupoFutebol.Domain.Interfaces;
using GrupoFutebol.Infrastructure.Data;
using GrupoFutebol.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

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

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

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
