# Azure Deployment Guide: AI Value Cockpit & Enterprise Agents

This directory contains the production-ready Azure Infrastructure as Code (Bicep) and automated deployment scripts to deploy the **AI Performance & Value Cockpit** along with both enterprise agents directly from your local terminal to an assigned Azure Resource Group.

---

## Architecture Overview

The deployment provisions the following resources inside your Azure Resource Group:
1. **Azure Container Registry (ACR):** Private registry holding your production images.
2. **Log Analytics Workspace:** Telemetry and live container logs.
3. **Azure Container Apps Managed Environment:** Serverless container cluster with automatic HTTPS, TLS termination, and ingress.
4. **Container App 1: `wct-cockpit` (Frontend)**
   - Production Nginx server hosting the compiled Vite React Single Page Application.
   - Built-in reverse proxy routing `/api/` directly to the backend container.
5. **Container App 2: `wct-api` (Backend & Copilot Studio Agent)**
   - FastAPI REST API with pre-loaded SQLite database (`cockpit.db`), FinOps algorithms, and Dataverse OData endpoints.
   - Hosts the **Global Supply Chain & Order Dispatch Bot** Teams canvas at `/api/v1/copilot-studio/ui`.
6. **Container App 3: `wct-it-agent` (IT Support Agent)**
   - Standalone Tier-1 IT Support Assistant web chat at `/ui`.

---

## Prerequisites

1. **Azure CLI (`az`) installed:**
   Verify by running:
   ```powershell
   az --version
   ```
2. **Logged in to Azure:**
   ```powershell
   az login
   ```
3. **Your Assigned Azure Resource Group Name:** (e.g. `rg-wct-demo-prod`)

---

## 1-Click Deployment (From Local)

Open PowerShell in `C:\Project\AI_Cockpit` and run:

```powershell
.\deploy.ps1 -ResourceGroupName "YOUR_ASSIGNED_RESOURCE_GROUP_NAME" -Location "eastus"
```

### What the script does automatically:
1. Verifies your Azure CLI login.
2. Creates or connects to your designated Resource Group.
3. Automatically provisions the private Azure Container Registry (`ACR`).
4. Uses **`az acr build`** to compile the containers directly in the cloud (no local Docker daemon required!).
5. Runs **`infra/main.bicep`** to deploy the serverless Container Apps.
6. Returns the **3 live public HTTPS URLs**:
   * **Main Cockpit Dashboard:** `https://wct-cockpit.<region>.azurecontainerapps.io`
   * **Copilot Studio Supply Chain Agent:** `https://wct-api.<region>.azurecontainerapps.io/api/v1/copilot-studio/ui`
   * **IT Support Ticket Assistant:** `https://wct-it-agent.<region>.azurecontainerapps.io/ui`

---

## Optional Parameters

If you have Azure OpenAI credentials to connect to the IT Agent:

```powershell
.\deploy.ps1 `
    -ResourceGroupName "YOUR_ASSIGNED_RESOURCE_GROUP_NAME" `
    -Location "eastus" `
    -AzureOpenAIEndpoint "https://your-resource.openai.azure.com/" `
    -AzureOpenAIApiKey "your-azure-openai-api-key"
```

---

## Verification & Health Checks

Once deployed, you can verify each service:
* **Cockpit Web UI:** Open the `wct-cockpit` URL in any browser. Log in as `cxo@wct.com` or `admin@wct.com`.
* **Supply Chain Agent:** Open the `copilotStudioAgentUrl`. Test clicking chips like *"Check safety stock for Intel Core Ultra 7"* or *"Track shipment PO-98412"*.
* **IT Support Agent:** Open the `itSupportAgentUrl` to interact with the IT assistant webchat.
