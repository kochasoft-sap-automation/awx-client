// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

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
    public group_names: string[] = [],
    public variables: any = null,

    public organization_id: string = "",
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


export class AwxConfig {

  // AWX host and credentials.
  public awx_host: string = "";
  public awx_username: string = "";
  public awx_password: string = "";

  // Credential for the ansible repo.
  public gh_token_name: string = "";
  public gh_token_username: string = "";
  public gh_token_value: string = "";


  // Credential for the ssh key.
  public ssh_key_name: string = "";
  public ssh_private_key_value: string = "";

  // Project from ansible repo.
  public project_name: string = "";
  public project_repo: string = "";
  public project_branch: string = "";

  public inventories: Inventory[] = [];

  constructor() {}
}
