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
    public inventory_id: string,
    public project_id: string,
    public playbook_name: string,
    public description: string = "",
  ) {}
}
