# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY src/GrupoFutebol.Domain/GrupoFutebol.Domain.csproj         src/GrupoFutebol.Domain/
COPY src/GrupoFutebol.Application/GrupoFutebol.Application.csproj src/GrupoFutebol.Application/
COPY src/GrupoFutebol.Infrastructure/GrupoFutebol.Infrastructure.csproj src/GrupoFutebol.Infrastructure/
COPY src/GrupoFutebol.API/GrupoFutebol.API.csproj               src/GrupoFutebol.API/

RUN dotnet restore src/GrupoFutebol.API/GrupoFutebol.API.csproj

COPY src/ src/

RUN dotnet publish src/GrupoFutebol.API/GrupoFutebol.API.csproj \
    -c Release -o /app/publish --no-restore

# Stage 2: runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "GrupoFutebol.API.dll"]
