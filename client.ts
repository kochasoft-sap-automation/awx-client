// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import axios from 'axios';
import { Group, Inventory, JobTemplate, Project } from './entities';


type QueryParameters = Record<string, string>;


// Doesn't typescript has an assertion function?
function assert(cond: boolean, error_msg: string = "<no-message>") {
  if (!cond) throw Error(`Assertion Error: ${error_msg}`);
}


export class AwxClient {

  username: string;
  password: string;
  host_url: string;

  constructor(host_url: string, username: string, password: string) {
    assert(!host_url.endsWith('/'), "Host URL shouln't end with '/' character.");

    this.username = username;
    this.password = password;
    this.host_url = host_url;
  }


  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------


  async getUserID(): Promise<string> {
    const data = await this.get("/api/v2/me");
    assert(data.results.length >= 1);
    return data.results[0].id;
  }


  async getOrganizationID(organization_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/organizations/");
    return this._getIdFromName(data.results, organization_name, "organization", _throw);
  }


  async getHostIDFromInventory(host_name: string, inventory_id: string, _throw: boolean = false): Promise<string> {
    const data = await this.get(`/api/v2/inventories/${inventory_id}/hosts/`);
    return this._getIdFromName(data.results, host_name, "host", _throw);
  }

  async getHostIDFromGroup(host_name: string, group_id: string, _throw: boolean = false): Promise<string> {
    const data = await this.get(`/api/v2/groups/${group_id}/hosts/`);
    return this._getIdFromName(data.results, host_name, "host", _throw);
  }


  async getCredentialID(credential_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/credentials/");
    return this._getIdFromName(data.results, credential_name, "credential", false);
  }


  async getProjectID(project_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/projects/");
    return this._getIdFromName(data.results, project_name, "project", _throw);
  }
  
  
  async getInventoryID(inventory_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/inventories/");
    return this._getIdFromName(data.results, inventory_name, "inventory", _throw);
  }


  async getGroupID(group_name: string, inventory_id: string, _throw: boolean = false): Promise<string> {
    const data = await this.get(`/api/v2/inventories/${inventory_id}/groups/`);
    return this._getIdFromName(data.results, group_name, "group", _throw);
  }


  async getJobTemplateID(job_template_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/job_templates/");
    return this._getIdFromName(data.results, job_template_name, "job_template", _throw);    
  }


  async getPlaybooks(project_id: string): Promise<string[]> {
    const data = await this.get(`/api/v2/projects/${project_id}/playbooks/`);
    return data;
  }

  async getJobTemplate(job_template_id: string): Promise<any>{
    return await this.get(`/api/v2/job_templates/${job_template_id}/`)
  }

  // Results is a list with the properties .name and .id, it'll find the
  // Result with the given name and return its id.
  _getIdFromName(results: any, name: string,
    entry_name: string = "entry", throw_not_found: boolean = true): string {

    for (let value of results) {
      if (value.name == name) return value.id;
    }

    if (throw_not_found) {
      throw Error(`No ${entry_name} exists with name "${name}".`);
    }
    return "";
  }


  // --------------------------------------------------------------------------
  // Create methods
  // --------------------------------------------------------------------------

  async createScmCredential(name: string, gh_username: string, gh_token: string): Promise<string> {
    const data = await this.post("/api/v2/credentials/", {
      name : name,
      credential_type : 2, // SCM (FXIME: this is a magic value here).
      // ID of "user", "team", "organization" (all of them are mutually exclusive).
      user : await this.getUserID(),
      inputs : {
        username : gh_username,
        password : gh_token,
      }
    });
    return data.id;
  }


  async createProject(project: Project): Promise<string> {
    const data = await this.post("/api/v2/projects/", {
      name: project.name,
      description: project.description,
      scm_type: "git",
      scm_url: project.repo_url,
      scm_branch: project.repo_branch,
      credential: project.credential_id,
    });
    return data.id;
  }


  async createInventory(inventory: Inventory): Promise<string> {
    const data = await this.post("/api/v2/inventories/", {
      name: inventory.name,
      description: inventory.description,
      organization: inventory.organization_id,
      kind: (inventory.smart) ? "smart" : "",
    });
    return data.id;
  }


  async createGroup(group: Group): Promise<string> {
    const data = await this.post("/api/v2/groups/", {
      name: group.name,
      description: group.description,
      inventory: group.inventory_id,
    });
    return data.id;
  }

  async createHostInInventory(host_name: string, inventory_id: string): Promise<string>{
    const data = await this.post(`/api/v2/inventories/${inventory_id}/hosts/`,{
      name: host_name,
    })
    return data.id;
  }


  async createJobTemplate(job_template: JobTemplate) {
    const data = await this.post("/api/v2/job_templates/", {
      name: job_template.name,
      description: job_template.description,
      inventory: job_template.inventory_id,
      project: job_template.project_id,
      playbook: job_template.playbook_name,
      allow_simultaneous: job_template.concurrent,
      ask_inventory_on_launch: (job_template.inventory_id == "") ? true : false,
    });
    return data.id;
  }


  async addHostToGroup(inventory_id: string, group_id: string, host_name: string): Promise<string> {
    const data = await this.post(`/api/v2/groups/${group_id}/hosts/`,{
      name: host_name,
      inventory: inventory_id,
    });
    return data.id;
  }


  // Here job_template is the response object from the GET job template request but updated.
  async updateJobTemplate(job_template_id: string, job_template: any): Promise<any> {
    return await this.put(`/api/v2/job_templates/${job_template_id}/`, job_template);
  }


  async launchJobTemplate(job_template_id: string):Promise<any> {
    const data = await this.post(`/api/v2/job_templates/${job_template_id}/launch/`, {});
    return data.id;
  }


  // --------------------------------------------------------------------------
  // "Low level" internal functions
  // --------------------------------------------------------------------------


  async get(endpoint: string, params: QueryParameters = {}): Promise<any> {
    const response = await axios.get(
      `${this.host_url}${endpoint}`,
      {
        auth: {
          username: this.username,
          password: this.password,
        },
        params: params,
      }
    );
    return response.data;
  }

  
  async post(endpoint: string, data: {} | undefined, params: QueryParameters = {}): Promise<any> {

    const response = await axios.post(
      `${this.host_url}${endpoint}`,
      data,
      {
        auth: {
          username: this.username,
          password: this.password,
        },
        params: params,
      }
    );
    return response.data;
  }


  async put(endpoint: string, data:{} | undefined, params: QueryParameters = {}): Promise<any>{
    const response = await axios.put(
      `${this.host_url}${endpoint}`,
      data,
      {
        auth: {
          username: this.username,
          password: this.password,
        },
        params: params,
      }
    );
  }

}
