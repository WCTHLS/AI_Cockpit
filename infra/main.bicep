@description('Prefix for all deployed resource names')
param appPrefix string = 'wct'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Azure Container Registry Name (alphanumeric only, 5-50 chars)')
param acrName string = 'acr${uniqueString(resourceGroup().id)}'

@description('Tag for container images')
param imageTag string = 'latest'

@description('Optional: Azure OpenAI Endpoint')
param azureOpenAIEndpoint string = ''

@description('Optional: Azure OpenAI API Key')
@secure()
param azureOpenAIApiKey string = ''

@description('Optional: Azure OpenAI Deployment Name')
param azureOpenAIDeployment string = 'it-agent-model'

// 1. Log Analytics Workspace for Container Apps Environment
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appPrefix}-logs-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// 2. Azure Container Registry (Basic SKU)
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// 3. Azure Container Apps Managed Environment
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appPrefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// 4. Backend API & Copilot Studio Agent (Port 8000)
resource apiApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appPrefix}-api'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['*']
          allowedHeaders: ['*']
        }
      }
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'openai-key'
          value: azureOpenAIApiKey
        }
      ]
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'wct-api'
          image: '${acr.properties.loginServer}/wct-api:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              value: 'sqlite:////app/db/cockpit.db'
            }
            {
              name: 'SQLITE_DB_PATH'
              value: '/app/db/cockpit.db'
            }
            {
              name: 'CORS_ORIGINS'
              value: '*'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// 5. Tier-1 IT Support Agent (Port 8080)
resource itAgentApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appPrefix}-it-agent'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['*']
          allowedHeaders: ['*']
        }
      }
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'openai-key'
          value: azureOpenAIApiKey
        }
      ]
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'wct-it-agent'
          image: '${acr.properties.loginServer}/wct-it-agent:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'COCKPIT_API_URL'
              value: 'https://${apiApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: azureOpenAIEndpoint
            }
            {
              name: 'AZURE_OPENAI_API_KEY'
              secretRef: 'openai-key'
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: azureOpenAIDeployment
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

// 6. Frontend Cockpit Web UI (Port 80)
resource webApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${appPrefix}-cockpit'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'wct-cockpit'
          image: '${acr.properties.loginServer}/wct-web:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'BACKEND_URL'
              value: 'https://${apiApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Outputs: The 3 Live Public URLs
output cockpitWebUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output copilotStudioAgentUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}/api/v1/copilot-studio/ui'
output itSupportAgentUrl string = 'https://${itAgentApp.properties.configuration.ingress.fqdn}/ui'
output acrLoginServer string = acr.properties.loginServer
