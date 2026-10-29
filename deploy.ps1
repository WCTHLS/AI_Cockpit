# ==============================================================================
# WCT AI Performance & Governance Cockpit - Azure 1-Click Deployment Script
# Deploys directly from your local terminal to the assigned Azure Resource Group
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false, HelpMessage="Azure Resource Group name")]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$false, HelpMessage="Azure Region (e.g. eastus, centralus, westeurope)")]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false, HelpMessage="Optional Azure OpenAI Endpoint")]
    [string]$AzureOpenAIEndpoint = "",

    [Parameter(Mandatory=$false, HelpMessage="Optional Azure OpenAI API Key")]
    [string]$AzureOpenAIApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   WCT AI COCKPIT & AGENTS - AZURE DEPLOYMENT (CONTAINER APPS + BICEP)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Prompt for Resource Group if not provided
if (-not $ResourceGroupName) {
    $ResourceGroupName = Read-Host "Enter the Azure Resource Group name provided to you"
}

if (-not $ResourceGroupName) {
    Write-Error "Resource Group name is required. Exiting."
}

# 2. Check Azure CLI Login Status
Write-Host "Checking Azure CLI authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "You are not logged in to Azure CLI. Launching 'az login'..." -ForegroundColor Yellow
    az login --output none
    $account = az account show | ConvertFrom-Json
}

Write-Host "Active Azure Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host "Target Resource Group:    $ResourceGroupName" -ForegroundColor Green
Write-Host "Target Region:            $Location" -ForegroundColor Green
Write-Host ""

# 3. Ensure Resource Group Exists
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -ne "true") {
    Write-Host "Resource group '$ResourceGroupName' does not exist yet. Creating it in $Location..." -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location --output none
    Write-Host "Resource group created successfully." -ForegroundColor Green
} else {
    Write-Host "Target Resource Group verified." -ForegroundColor Green
}

# 4. Determine or create Azure Container Registry (ACR)
$rgId = (az group show --name $ResourceGroupName --query "id" -o tsv).Trim()
$sha = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($rgId))
$hashStr = ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").Substring(0, 10).ToLower()
$acrName = "wctacr$hashStr"

Write-Host "Checking Azure Container Registry: $acrName..." -ForegroundColor Yellow
$acrCheck = az acr check-name --name $acrName | ConvertFrom-Json
if ($acrCheck.nameAvailable -eq $true) {
    Write-Host "Provisioning Azure Container Registry '$acrName'..." -ForegroundColor Yellow
    az acr create --resource-group $ResourceGroupName --name $acrName --sku Basic --admin-enabled true --location $Location --output none
    Write-Host "ACR created successfully." -ForegroundColor Green
} else {
    Write-Host "ACR '$acrName' is ready." -ForegroundColor Green
}

$acrServer = "$acrName.azurecr.io"

# 5. Build Container Images in Cloud (Fast & No local Docker daemon overhead)
Write-Host ""
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Building & Pushing 3 Container Images via Azure ACR Build (Local -> Cloud)..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) { $scriptRoot = Get-Location }

Write-Host "[1/3] Building Backend & Copilot Studio Agent ($acrServer/wct-api:latest)..." -ForegroundColor Yellow
az acr build --registry $acrName --image wct-api:latest "$scriptRoot/backend"

Write-Host "[2/3] Building Cockpit Web UI with Nginx Proxy ($acrServer/wct-web:latest)..." -ForegroundColor Yellow
az acr build --registry $acrName --image wct-web:latest "$scriptRoot/frontend"

Write-Host "[3/3] Building Tier-1 IT Support Assistant ($acrServer/wct-it-agent:latest)..." -ForegroundColor Yellow
az acr build --registry $acrName --image wct-it-agent:latest "$scriptRoot/agent_service"

Write-Host ""
Write-Host "All 3 container images successfully built and pushed to ACR!" -ForegroundColor Green

# 6. Deploy Container Apps via Bicep
Write-Host ""
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Executing Bicep Deployment (Container Apps Environment & Services)..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan

$bicepPath = Join-Path $scriptRoot "infra/main.bicep"

$params = @(
    "acrName=$acrName",
    "location=$Location"
)

if ($AzureOpenAIEndpoint) {
    $params += "azureOpenAIEndpoint=$AzureOpenAIEndpoint"
}
if ($AzureOpenAIApiKey) {
    $params += "azureOpenAIApiKey=$AzureOpenAIApiKey"
}

$deployOutput = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file $bicepPath `
    --parameters $params `
    --output json | ConvertFrom-Json

# 7. Print Final Live HTTPS URLs
$cockpitUrl = $deployOutput.properties.outputs.cockpitWebUrl.value
$copilotUrl = $deployOutput.properties.outputs.copilotStudioAgentUrl.value
$itAgentUrl = $deployOutput.properties.outputs.itSupportAgentUrl.value

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "              DEPLOYMENT COMPLETED SUCCESSFULLY! LIVE URLS:                     " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Main AI Value Cockpit Dashboard:" -ForegroundColor White
Write-Host "     $cockpitUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Copilot Studio Global Supply Chain Agent (Teams Canvas):" -ForegroundColor White
Write-Host "     $copilotUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Tier-1 IT Support Ticket Triage Assistant:" -ForegroundColor White
Write-Host "     $itAgentUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "Share these 3 URLs with your enterprise stakeholders and executive evaluators." -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
