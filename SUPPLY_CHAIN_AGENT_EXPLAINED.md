# Global Supply Chain & Order Dispatch Bot: Plain-English Guide

## What is this Agent?
The **Global Supply Chain & Order Dispatch Bot** is an automated digital assistant for enterprise supply chain, warehouse, and logistics operations.

Instead of an employee spending 15 to 30 minutes logging into SAP, checking carrier shipping websites, or creating tickets manually, this bot handles repetitive logistics tasks automatically.

---

## 1. What Exactly Does It Do in Practice?

Here are the 4 real-world everyday tasks this bot handles:

| Everyday Situation | What the Employee Asks | What the Bot Does Automatically | Time Saved |
| :--- | :--- | :--- | :--- |
| **1. Track Shipments** | *'Where is PO-98412 with 2,000 ThinkPads from the factory?'* | Checks SAP and ocean carrier tracking, verifies customs clearance status at port, and provides an exact arrival date. | **~20 mins** |
| **2. Defective Part Returns (RMA)** | *'Need to return 150 damaged battery packs.'* | Automatically logs an RMA ticket in ServiceNow and emails a pre-paid FedEx shipping label to the warehouse lead. | **~30 mins** |
| **3. Check Warehouse Stock** | *'Do we have enough Intel Core Ultra processors in Memphis?'* | Queries warehouse inventory in SAP to check available stock and reserves for active assembly orders. | **~15 mins** |
| **4. Supplier Delays & Escalations** | *'Display screen supplier announces a 4-week factory shutdown.'* | Detects the bottleneck, assesses supply impact, and alerts the Procurement Manager in Microsoft Teams. | **~5 mins** |

---

## 2. How is it Similar to a Microsoft Copilot Studio Bot?

Microsoft Copilot Studio is Microsoft's low-code platform for building business workflow bots on top of **Microsoft Power Platform** and **Microsoft Dataverse**.

This agent was built to work **identically** to a real Copilot Studio bot:

1. **Uses Microsoft Dataverse Format**:
   * Real Copilot Studio bots save conversation logs to a Dataverse table called conversationtranscript.
   * This agent exposes the exact same Microsoft Dataverse OData format (/copilot-studio/dataverse/conversationtranscripts).
2. **Standard Session Outcomes**:
   * Just like Copilot Studio, it tags every interaction as **Resolved** (deflected without human intervention), **Escalated** (passed to a human manager), or **Abandoned**.
3. **Capacity Pack Pricing Model**:
   * Instead of charging by individual text tokens, Copilot Studio charges via monthly tenant packs ($200/month for up to 25,000 billed queries). This bot models that exact $200/month capacity fee.
4. **Interactive Teams Chat UI**:
   * You can test and chat with this bot live in a Microsoft Teams-style webchat widget at: http://localhost:8000/copilot-studio/ui

---

## 3. Why is it in the AI Cockpit?

1. **Compares Different Types of AI Side-by-Side**:
   * **Custom Code Bot** (*Ticket Triage Agent*): High-volume, charged per token on Azure OpenAI ($45.84/mo).
   * **Low-Code Business Bot** (*Supply Chain Bot*): Charged as a fixed monthly capacity pack ($200.00/mo).
   * **Developer Productivity Tool** (*Antigravity IDE*): Charged per seat licensing ($60.00/mo).
2. **Proves If the Bot is Making Money or Wasting It**:
   * The cockpit calculates whether the $200/mo capacity pack is worth it:
     * **Cost**: $200.00 / month
     * **Labor Value Generated**: $544.90 / month (from 152 automated logistics tasks)
     * **Net Gain**: **+$344.90 NET positive return**
3. **Simulates Enterprise Telemetry**:
   * Enterprises can test Dataverse and Application Insights telemetry feeds in the cockpit without needing high-level production Microsoft 365 admin rights.
