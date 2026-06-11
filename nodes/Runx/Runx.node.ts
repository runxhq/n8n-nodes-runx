import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from "n8n-workflow";
import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";

type RunxOperation = "runSkill" | "getRun" | "getReceipt";

export class Runx implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Runx",
    name: "runx",
    group: ["transform"],
    version: 1,
    subtitle: "={{$parameter.operation}}",
    description: "Submit governed runx skill runs and read run receipts.",
    icon: { light: "file:../../icons/runx.svg", dark: "file:../../icons/runx.dark.svg" },
    defaults: {
      name: "Runx",
    },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "runxApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        default: "runSkill",
        options: [
          {
            name: "Get Receipt",
            value: "getReceipt",
            description: "Read a hosted receipt by ID",
            action: "Get a runx receipt",
          },
          {
            name: "Get Run",
            value: "getRun",
            description: "Read a hosted run by ID",
            action: "Get a runx run",
          },
          {
            name: "Run Skill",
            value: "runSkill",
            description: "Submit a governed hosted skill run",
            action: "Run a runx skill",
          },
        ],
      },
      {
        displayName: "Skill",
        name: "skill",
        type: "string",
        default: "runx/n8n-handoff",
        required: true,
        displayOptions: {
          show: {
            operation: ["runSkill"],
          },
        },
        description: "Skill reference, such as runx/n8n-handoff or weather-forecast",
      },
      {
        displayName: "Inputs",
        name: "inputs",
        type: "json",
        default: "{}",
        displayOptions: {
          show: {
            operation: ["runSkill"],
          },
        },
        description: "JSON object passed as the hosted skill inputs",
      },
      {
        displayName: "Idempotency Key",
        name: "idempotencyKey",
        type: "string",
        default: "",
        displayOptions: {
          show: {
            operation: ["runSkill"],
          },
        },
        description: "Optional stable key for retry-safe run submission",
      },
      {
        displayName: "Run ID",
        name: "runId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["getRun"],
          },
        },
        description: "Hosted run ID to read",
      },
      {
        displayName: "Receipt ID",
        name: "receiptId",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["getReceipt"],
          },
        },
        description: "Hosted receipt ID to read",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = await this.getCredentials("runxApi");
    const baseUrl = normalizeBaseUrl.call(this, credentials.baseUrl);
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      try {
        const operation = this.getNodeParameter("operation", itemIndex) as RunxOperation;
        const request = buildRequest.call(this, operation, itemIndex, baseUrl);
        const response = await this.helpers.httpRequestWithAuthentication.call(this, "runxApi", request);

        returnData.push({
          json: normalizeResponse(response),
          pairedItem: {
            item: itemIndex,
          },
        });
      } catch (error) {
        const nodeError = toNodeError.call(this, error, itemIndex);
        if (!this.continueOnFail()) {
          throw nodeError;
        }
        returnData.push({
          json: {
            error: nodeError.message,
          },
          pairedItem: {
            item: itemIndex,
          },
        });
      }
    }

    return [returnData];
  }
}

function buildRequest(this: IExecuteFunctions, operation: RunxOperation, itemIndex: number, baseUrl: string): IHttpRequestOptions {
  if (operation === "runSkill") {
    const skill = requiredText.call(this, "skill", itemIndex, "Skill");
    const idempotencyKey = optionalText(this.getNodeParameter("idempotencyKey", itemIndex, ""));
    const body: IDataObject = {
      inputs: parseJsonObject.call(this, "inputs", itemIndex),
    };
    if (idempotencyKey) {
      body.idempotency_key = idempotencyKey;
    }

    const headers: IDataObject = {};
    if (idempotencyKey) {
      headers["idempotency-key"] = idempotencyKey;
    }

    return {
      method: "POST",
      url: `${baseUrl}${skillRunPath(skill)}`,
      body,
      headers,
      json: true,
    };
  }

  if (operation === "getRun") {
    const runId = requiredText.call(this, "runId", itemIndex, "Run ID");
    return {
      method: "GET",
      url: `${baseUrl}/v1/runs/${encodeURIComponent(runId)}`,
      json: true,
    };
  }

  if (operation === "getReceipt") {
    const receiptId = requiredText.call(this, "receiptId", itemIndex, "Receipt ID");
    return {
      method: "GET",
      url: `${baseUrl}/v1/receipts/${encodeURIComponent(receiptId)}`,
      json: true,
    };
  }

  throw new NodeOperationError(this.getNode(), `Unsupported runx operation: ${operation}`);
}

function skillRunPath(skill: string): string {
  const parts = skill.split("/");
  if (parts.length === 2 && parts.every((part) => part.length > 0)) {
    return `/v1/skills/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}/run`;
  }
  return `/v1/skills/${encodeURIComponent(skill)}/run`;
}

function parseJsonObject(this: IExecuteFunctions, parameterName: string, itemIndex: number): IDataObject {
  const value = this.getNodeParameter(parameterName, itemIndex, "{}");
  if (isDataObject(value)) {
    return value;
  }
  const raw = optionalText(value);
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new NodeOperationError(this.getNode(), `Inputs must be valid JSON: ${(error as Error).message}`, {
      itemIndex,
    });
  }
  if (!isDataObject(parsed)) {
    throw new NodeOperationError(this.getNode(), "Inputs must be a JSON object.", {
      itemIndex,
    });
  }
  return parsed;
}

function normalizeBaseUrl(this: IExecuteFunctions, value: unknown): string {
  const baseUrl = optionalText(value).replace(/\/+$/u, "");
  if (!baseUrl) {
    throw new NodeOperationError(this.getNode(), "Runx API Base URL is required.");
  }
  if (!/^https?:\/\//u.test(baseUrl)) {
    throw new NodeOperationError(this.getNode(), "Runx API Base URL must start with http:// or https://.");
  }
  return baseUrl;
}

function requiredText(this: IExecuteFunctions, parameterName: string, itemIndex: number, displayName: string): string {
  const value = optionalText(this.getNodeParameter(parameterName, itemIndex));
  if (!value) {
    throw new NodeOperationError(this.getNode(), `${displayName} is required.`, {
      itemIndex,
    });
  }
  return value;
}

function optionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDataObject(value: unknown): value is IDataObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeResponse(value: unknown): IDataObject {
  return isDataObject(value) ? value : { data: value as string | number | boolean | null };
}

function toNodeError(this: IExecuteFunctions, error: unknown, itemIndex: number): NodeApiError | NodeOperationError {
  if (error instanceof NodeOperationError || error instanceof NodeApiError) {
    return error;
  }
  if (isJsonObject(error)) {
    return new NodeApiError(this.getNode(), error, { itemIndex });
  }
  return new NodeOperationError(this.getNode(), error instanceof Error ? error.message : String(error), {
    itemIndex,
  });
}

function isJsonObject(value: unknown): value is JsonObject {
  if (!isDataObject(value)) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonObject[keyof JsonObject] {
  if (value === null) {
    return true;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}
