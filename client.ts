// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

// Reference: https://docs.ansible.com/ansible-tower/latest/html/towerapi/api_ref.html


import axios from 'axios';
import { Group, Inventory, JobTemplate, Project, WorkflowNode, WorkflowTemplate } from './entities';


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


  log(message: string) {
    console.log(message);
  }


  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------


  async getUser(): Promise<any> {
    const data = await this.get("/api/v2/me");
    assert(data.results.length >= 1);
    return data.results[0];
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


  async getWorkflowTemplateID(workflow_job_template_name: string, _throw: boolean = false): Promise<string> {
    const data = await this.get("/api/v2/workflow_job_templates/");
    return this._getIdFromName(data.results, workflow_job_template_name, "workflow_job_template", _throw)
  }


  async getPlaybooks(project_id: string): Promise<string[]> {
    const data = await this.get(`/api/v2/projects/${project_id}/playbooks/`);
    return data;
  }


  async getJobTemplate(job_template_id: string): Promise<any>{
    return await this.get(`/api/v2/job_templates/${job_template_id}/`)
  }


  async getWorkflowTemplate(workflow_template_id: string): Promise<any>{
    return await this.get(`/api/v2/workflow_job_templates/${workflow_template_id}/`)
  }


  async getJob(job_id: string): Promise<any> {
    const data = await this.get(`/api/v2/jobs/${job_id}/`);
    return data;
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

      // To view the credential details check the url:
      // "https://{awxhost}/api/v2/credential_types/"
      //
      credential_type : 2, // SCM.

      // TODO: I should consider team or organization here instead of a single user.
      // ID of "user", "team", "organization" (all of them are mutually exclusive).
      user : (await this.getUser()).id,

      inputs : {
        username : gh_username,
        password : gh_token,
      }
    });
    return data.id;
  }

  
  async createSshCredential(name: string, private_key: string): Promise<string> {
    const data = await this.post("/api/v2/credentials/", {
      name : name,

      // To view the credential details check the url:
      // "https://{awxhost}/api/v2/credential_types/"
      //
      credential_type : 1, // SSH.

      // TODO: I should consider team or organization here instead of a single user.
      // ID of "user", "team", "organization" (all of them are mutually exclusive).
      user : (await this.getUser()).id,

      inputs : {
        ssh_key_data : private_key,
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

    // TODO: Have a max try to prevent this from an infinite loop with re-try
    // delay time.
    const clone_job_id = data.summary_fields.current_job.id;
    while (true) {
      const job_data = await this.get(`/api/v2/project_updates/${clone_job_id}/`);
      console.log(`  Cloning project "${project.name}" status = ${job_data.status}`);

      if (job_data.status == "failed") {
        throw Error(`Cloning "${project.repo_url}" was failed.\n\njob_data = ${job_data}`);
      }

      if (job_data.status == "successful") {
        break;
      }
    }

    return data.id;
  }


  async createInventory(inventory: Inventory): Promise<string> {
    assert(
      inventory.organization_id != "",
      `Organization ID for the inventory (name=${inventory.name}) was not set.`);

    const data = await this.post("/api/v2/inventories/", {
      name: inventory.name,
      description: inventory.description,
      organization: inventory.organization_id,
      kind: (inventory.smart) ? "smart" : "",
      variables: JSON.stringify(inventory.variables),
    });

    const inventory_id = data.id;

    // Create The groups in the above inventory.
    for (let group_name of inventory.group_names) {
      const group_id =
        await this.getGroupID(group_name, inventory_id) ||
        await this.createGroup(new Group(group_name, inventory_id));
      console.log(`Group ${group_name} id = ${group_id}`);
    }

    return inventory_id;
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
      organization: job_template.organization_id,
      inventory: job_template.inventory_id,
      project: job_template.project_id,
      playbook: job_template.playbook_name,
      allow_simultaneous: job_template.concurrent,
      ask_inventory_on_launch: (job_template.inventory_id == "") ? true : false,
    });


    const resp = await this.post(`/api/v2/job_templates/${data.id}/credentials/`, {
      id: job_template.ssh_private_key_id
    });
    return data.id;
  }


  async createWorkflowTemplate(workflow_job_template: WorkflowTemplate) {
    const data = await this.post("/api/v2/workflow_job_templates/", {
      name                    : workflow_job_template.name,
      description             : workflow_job_template.description,
      // organization            : workflow_job_template.organization_id, // TODO (arafath):
      allow_simultaneous      : workflow_job_template.concurrent,
      ask_inventory_on_launch : true, // TODO (thakee):
      extra_vars              : JSON.stringify(workflow_job_template.variables),
    });

    return data.id;
  }


  async createWorkflowTemplateNode(node: WorkflowNode) {
    assert(node.workflow_template != null, "workflow_template attribute of node was null.");
    assert(node.workflow_template?.wt_id != "", "workflow template id (wt_id) was empty");
    assert(node.job_template_id != "", "job template id of node was empty.");
    assert(node.workflow_template?.inventory_id != "", "inventory id of workflow template was empty.");

    const data = await this.post("/api/v2/workflow_job_template_nodes/", {
      workflow_job_template: node.workflow_template?.wt_id,
      unified_job_template: node.job_template_id,
      inventory: node.workflow_template?.inventory_id,
    });

    return data.id;
  }


  async createWorkflowTemplateNodeFromNode(node_id: string, node: WorkflowNode) {
    assert(node.workflow_template != null, "workflow_template attribute of node was null.");
    assert(node.workflow_template?.wt_id != "", "workflow template id (wt_id) was empty");
    assert(node.job_template_id != "", "job template id of node was empty.");
    assert(node.workflow_template?.inventory_id != "", "inventory id of workflow template was empty.");

    const type_endpoint = node.getTypeEndpoint();
    const data = await this.post(`/api/v2/workflow_job_template_nodes/${node_id}/${type_endpoint}/`, {
      workflow_job_template: node.workflow_template?.wt_id,
      unified_job_template: node.job_template_id,
      inventory: node.workflow_template?.inventory_id,
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


  async launchJobTemplate(job_template_id: string): Promise<any> {
    const data = await this.post(`/api/v2/job_templates/${job_template_id}/launch/`, {});
    return data.id;
  }


  async updateWorkflowTemplate(workflow_template_id: string, workflow_template: any): Promise<any> {
    return await this.put(`/api/v2/workflow_job_templates/${workflow_template_id}/`, workflow_template);
  }


  async launchWorkflowTemplate(workflow_template_id: string): Promise<any> {
    const data = await this.post(`/api/v2/workflow_job_templates/${workflow_template_id}/launch/`, {});
    return data.id
  }


  async getJobStatus(job_id: string): Promise<any> {
    const data = await this.get(`/api/v2/jobs/${job_id}/`);

    return data
  }


  async updatePassword(new_password: string): Promise<any> {
    const user = await this.getUser();
    const user_id = user.id;
    const user_input: any = {
      "email": user.email,
      "first_name": user.first_name,
      "last_name": user.last_name,
      "is_superuser": user.is_superuser,
      "is_system_auditor": user.is_system_auditor,
      "username": user.username,
      "password": new_password,
    }

    return await this.put(`/api/v2/users/${user_id}/`, user_input);
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


  async patch(endpoint: string, data:{} | undefined, params: QueryParameters = {}): Promise<any>{
    const response = await axios.patch(
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
