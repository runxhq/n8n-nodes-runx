import type {
  Icon,
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class RunxApi implements ICredentialType {
  name = "runxApi";
  displayName = "Runx API";
  icon: Icon = { light: "file:../icons/runx.svg", dark: "file:../icons/runx.dark.svg" };
  documentationUrl = "https://github.com/runxhq/runx/blob/main/oss/docs/orchestrator-integrations.md";

  properties: INodeProperties[] = [
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.runx.dev",
      placeholder: "https://api.runx.dev",
      required: true,
      description: "Hosted runx API base URL.",
    },
    {
      displayName: "API Token",
      name: "apiToken",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      required: true,
      description: "Bearer token scoped to runs:write, runs:read, and receipts:read for the initial public connector.",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "={{'Bearer ' + $credentials.apiToken}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl.replace(/\\/+$/, '')}}",
      url: "/v1/runs",
      method: "GET",
    },
  };
}
