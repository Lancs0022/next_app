# Définition des commandes et chemins
$path1 = "D:\Code\freellmapi"
# On utilise des apostrophes simples ici pour que $env reste du texte brut jusqu'à l'exécution dans la nouvelle fenêtre
$cmd1  = 'npm run dev'

$path2 = "D:\Code\Pejaa\next_app"
$cmd2  = "npx next dev --port 6969 -H 0.0.0.0"

# Fonctions pour lancer chaque instance
function Start-FreeLLM {
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-Command", "cd '$path1'; $cmd1"
}

function Start-Pejaa {
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-Command", "cd '$path2'; $cmd2"
}

# Menu de choix ou exécution par défaut
Write-Host "--- Gestionnaire de serveurs Dev ---" -ForegroundColor Cyan
Write-Host "1. Lancer FreeLLM (Port 6767)"
Write-Host "2. Lancer Pejaa (Port 6969)"
Write-Host "3. Lancer les DEUX (Fenêtres séparées)"
Write-Host "-------------------------------------"
$choix = Read-Host "Votre choix (1, 2 ou 3)"

switch ($choix) {
    "1" { Start-FreeLLM }
    "2" { Start-Pejaa }
    "3" { 
        Start-FreeLLM
        Start-Sleep -Milliseconds 500 # Un vrai petit délai propre pour laisser respirer la console
        Start-Pejaa 
    }
    Default { Write-Host "Choix invalide. Fin du script." -ForegroundColor Red }
}