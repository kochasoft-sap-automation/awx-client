// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import { assert } from "console";

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
    public organization_id: string,
    public ssh_private_key: string,
    public inventory_id: string = "",
    public description: string = "",
    public concurrent: boolean = true,
  ) {}
}


export class WorkflowTemplate {

  public wt_id: string = "";
  public inventory_id: string = "";
  public first_node: WorkflowNode | null = null;

  constructor(
    public name: string,
    public default_inventory_name: string,
    public description: string = "",
    public concurrent: boolean = true,
  ) {}

  public createNode(job_template_name: string) : WorkflowNode {
    this.first_node = new WorkflowNode("none", job_template_name);
    this.first_node.workflow_template = this;
    return this.first_node;
  }

}


export class WorkflowNode {

  public workflow_template: WorkflowTemplate | null = null;
  public job_template_id: string = "";

  public always_nodes: WorkflowNode[] = [];
  public success_nodes: WorkflowNode[] = [];
  public failure_nodes: WorkflowNode[] = [];

  constructor(
    public node_type: string,
    public job_template_name: string,
  ) {}

  public createNode(node_type: string, job_template_name: string) : WorkflowNode {

    let next_node = new WorkflowNode(node_type, job_template_name);
    next_node.workflow_template = this.workflow_template;

    switch (node_type) {
      case "none":
        throw "Bug! Cannot create none type node";
      case "always":
        this.always_nodes.push(next_node);
        break;
      case "success":
        this.always_nodes.push(next_node);
        break;
      case "failure":
        this.always_nodes.push(next_node);
        break;
      default:
        throw `Invalid node type. ${node_type}`;
    }
    return next_node;
  }

  public getTypeEndpoint(): string {
    return `${this.node_type}_nodes`;
  }

  public done(): WorkflowTemplate {
    if (! (this.workflow_template instanceof WorkflowTemplate)) {
      throw "workflow_template was null";
    }
    return this.workflow_template;
  }

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

  public workflow_templates: WorkflowTemplate[] = [];

  constructor() {}
}
