# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY Backend/src/GrupoFutebol.Domain/GrupoFutebol.Domain.csproj         Backend/src/GrupoFutebol.Domain/
COPY Backend/src/GrupoFutebol.Application/GrupoFutebol.Application.csproj Backend/src/GrupoFutebol.Application/
COPY Backend/src/GrupoFutebol.Infrastructure/GrupoFutebol.Infrastructure.csproj Backend/src/GrupoFutebol.Infrastructure/
COPY Backend/src/GrupoFutebol.API/GrupoFutebol.API.csproj               Backend/src/GrupoFutebol.API/

RUN dotnet restore Backend/src/GrupoFutebol.API/GrupoFutebol.API.csproj

COPY Backend/src/ Backend/src/

RUN dotnet publish Backend/src/GrupoFutebol.API/GrupoFutebol.API.csproj \
    -c Release -o /app/publish --no-restore

# Stage 2: runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "GrupoFutebol.API.dll"]
