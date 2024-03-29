// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import { AwxClient } from "./client";
import { AwxConfig, JobTemplate, Project, WorkflowNode } from "./entities";


export async function establishConnection(client: AwxClient) {

  const CONNECTION_RETRY_TIME: number = 5; // Will do the re-try in every 5 seconds.
  const CONNECTION_RETRY_COUNT: number = 10; // Will re-try the connection of totall 5.

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Current try for the connection.
  let connection_try = 1;

  while (connection_try <= CONNECTION_RETRY_COUNT) {

    try {
      const user_id = (await client.getUser()).id;
      console.log(`user_id = ${user_id}`);
      return;
    } catch (error: any) {
      switch(error.code) {
        case "ECONNREFUSED": break;
        case "ETIMEDOUT": break;
        default: throw error;
      }

      if (connection_try > CONNECTION_RETRY_COUNT) throw error;
      console.log(`Will retry becase ${error.code} in ${CONNECTION_RETRY_TIME} seconds.`);
    }

    await sleep(CONNECTION_RETRY_TIME * 1000);
    connection_try += 1;
    console.log("Retrying connection ...");

  }
}


export async function setupAwx(client: AwxClient, config: AwxConfig) {

  // TODO: Variablize the org name and create if it's not exists already.
  const organization_name = "Default";
  const organization_id = await client.getOrganizationID(organization_name, true);
  console.log(`Organization ${organization_name} id = ${organization_id}`);

  // Create inventory if not exists.
  for (let inventory of config.inventories) {
    inventory.organization_id = organization_id;
    const inventory_id =
      await client.getInventoryID(inventory.name) ||
      await client.createInventory(inventory);
    console.log(`Inventory ${inventory.name} id = ${inventory_id}`);
  }


  // Create credential if it's not already exists, possible if the last run of
  // this script failed and we run this again.
  const gh_token_id =
    await client.getCredentialID(config.gh_token_name) ||
    await client.createScmCredential(config.gh_token_name, config.gh_token_username, config.gh_token_value);
  console.log(`Github token ${config.gh_token_name} id = ${gh_token_id}`);
  
  
  // Create SSH key if it's not already exists.
  const ssh_key_name = config.ssh_key_name
  const ssh_key_id =
    await client.getCredentialID(ssh_key_name) ||
    await client.createSshCredential(ssh_key_name, config.ssh_private_key_value);
  console.log(`SSH key ${ssh_key_name} id = ${ssh_key_id}`);


  // Create project if it's not already exists. Otherwise we can re-use the repo.
  const project_id =
    await client.getProjectID(config.project_name) ||
    await client.createProject(new Project(config.project_name, gh_token_id, config.project_repo, config.project_branch));
  console.log(`Project ${config.project_name} id = ${project_id}`);


  // Create Job template for all the playbooks in the project.
  for (let playbook of await client.getPlaybooks(project_id)) {
    const job_template_name = playbook.replace(".yml", "").replaceAll("_", "-");
    const job_template_id =
      await client.getJobTemplateID(job_template_name) ||
      await client.createJobTemplate(new JobTemplate(job_template_name, project_id, playbook, organization_id, ssh_key_id));
    console.log(`JobTemplate ${job_template_name} id = ${job_template_id}`);
  }


  async function createNode(parent_node_id: string | null, node: WorkflowNode | null) {

    if (node === null) return;

    node.job_template_id = await client.getJobTemplateID(node.job_template_name);
    let current_node_id: string = "";

    if (parent_node_id === null) {
      current_node_id = await client.createWorkflowTemplateNode(node);
      console.log(`Node id = ${current_node_id}`);

    } else {
      current_node_id = await client.createWorkflowTemplateNodeFromNode(parent_node_id, node);
      console.log(`Node id = ${current_node_id}`);
    }

    for (let child_node of node.always_nodes) await createNode(current_node_id, child_node);
    for (let child_node of node.success_nodes) await createNode(current_node_id, child_node);
    for (let child_node of node.failure_nodes) await createNode(current_node_id, child_node);

  }


  for (let workflow_template of config.workflow_templates) {
    const workflow_id =
      await client.getWorkflowTemplateID(workflow_template.name) ||
      await client.createWorkflowTemplate(workflow_template);
    console.log(`WorkflowTemplate ${workflow_template.name} id = ${workflow_id}`);

    workflow_template.wt_id = workflow_id;
    workflow_template.inventory_id = await client.getInventoryID(workflow_template.default_inventory_name);

    await createNode(null, workflow_template.first_node);
  }

}



export async function addHostToGroup(client: AwxClient, inventory_name: string, group_name: string, host_name: string) {

  const inventory_id = await client.getInventoryID(inventory_name, true);
  const group_id = await client.getGroupID(group_name, inventory_id, true);

  let host_id =
    await client.getHostIDFromInventory(host_name, inventory_id) ||
    await client.createHostInInventory(host_name, inventory_id);

  host_id = await client.getHostIDFromGroup(host_name, group_id) ||
  await client.addHostToGroup(inventory_id, group_id, host_name);

  console.log(`Host ${host_name} id = ${host_id}`);

}



// Here variables should be a json object.
export async function launchJobTemplate(client: AwxClient, job_template_name: string, inventory_name: string, variables: any = {}) {

  const job_template_id = await client.getJobTemplateID(job_template_name, true);  
  const job_template = await client.getJobTemplate(job_template_id);
  
  job_template.inventory = await client.getInventoryID(inventory_name, true);
  job_template.extra_vars = JSON.stringify(variables);
  job_template.ask_inventory_on_launch = false;

  await client.updateJobTemplate(job_template_id, job_template);
  const job_id = await client.launchJobTemplate(job_template_id);
  console.log(`job id = ${job_id}`);

  return job_id;
}


export async function launchWorkflowTemplate(client: AwxClient, workflow_template_name: string, inventory_name: string, variables: any = {}){

  const workflow_template_id = await client.getWorkflowTemplateID(workflow_template_name, true);
  const workflow_template = await client.getWorkflowTemplate(workflow_template_id);

  workflow_template.inventory = await client.getInventoryID(inventory_name, true);
  workflow_template.extra_vars = JSON.stringify(variables);
  workflow_template.ask_inventory_on_launch = false;

  await client.updateWorkflowTemplate(workflow_template_id, workflow_template);
  const job_id = await client.launchWorkflowTemplate(workflow_template_id);
  console.log(`job id = ${job_id}`);

  return job_id;
}


export async function get_job_status(client: AwxClient, job_id: string) {

  const job_data = await client.getJobStatus(job_id);

  return job_data.status;
}
