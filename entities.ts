// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

export class AwxConfig {

  // AWX host and credentials.
  public awx_host: string = "";
  public awx_username: string = "";
  public awx_password: string = "";

  // Credential for the ansible repo.
  public credential_name: string = "";
  public credential_username: string = "";
  public credential_token: string = "";

  // Project from ansible repo.
  public project_name: string = "";
  public project_repo: string = "";
  public project_branch: string = "";

  // Inventories, where:
  //   key = The name of the inventory.
  //   val = Names of the groups in that inventory.
  public inventories: Record<string, string[]> = {};

  constructor() {}
}

export class Project {
  
  constructor(
    public name: string,
    public credential_id: string,
    public repo_url: string,
    public repo_branch: string = "main",
    public description: string = "",
  ) {}
}


export class Inventory {
  constructor(
    public name: string,
    public organization_id: string,
    public description: string = "",
    public smart: boolean = false,
  ) {}
}


export class Group {
  constructor(
    public name: string,
    public inventory_id: string,
    public description: string = "",
  ) {}
}


export class JobTemplate {
  constructor(
    public name: string,
    public project_id: string,
    public playbook_name: string,
    public inventory_id: string = "",
    public description: string = "",
    public concurrent: boolean = true,
  ) {}
}
