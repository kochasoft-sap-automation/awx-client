// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import { AwxClient } from "./client";
import { AwxConfig, Group, Inventory, JobTemplate, Project } from "./entities";


export async function setupAwx(client: AwxClient, config: AwxConfig) {

  // TODO: Variablize the org name and create if it's not exists already.
  const organization_name = "Default";
  const organization_id = await client.getOrganizationID(organization_name, true);
  console.log(`Organization ${organization_name} id = ${organization_id}`);


  // Create inventory if not exists.
  for (let inventory_name in config.inventories) {
    const inventory_id =
      await client.getInventoryID(inventory_name) ||
      await client.createInventory(new Inventory(inventory_name, organization_id));
    console.log(`Inventory ${inventory_name} id = ${inventory_id}`);

    // Create The groups in the above inventory.
    for (let group_name of config.inventories[inventory_name]) {
      const group_id =
        await client.getGroupID(group_name, inventory_id) ||
        await client.createGroup(new Group(group_name, inventory_id));
      console.log(`Group ${group_name} id = ${group_id}`);
    }
  }


  // Create credential if it's not already exists, possible if the last run of
  // this script failed and we run this again.
  const credential_id =
    await client.getCredentialID(config.credential_name) ||
    await client.createScmCredential(config.credential_name, config.credential_username, config.credential_token);
  console.log(`Credential ${config.credential_name} id = ${credential_id}`);


  // Create project if it's not already exists. Otherwise we can re-use the repo.
  const project_id =
    await client.getProjectID(config.project_name) ||
    await client.createProject(new Project(config.project_name, credential_id, config.project_repo, config.project_branch));
  console.log(`Project ${config.project_name} id = ${project_id}`);


  // Create Job template for all the playbooks in the project.
  for (let playbook of await client.getPlaybooks(project_id)) {
    const job_template_name = playbook.replace(".yml", "").replaceAll("_", "-");
    const job_template_id =
      await client.getJobTemplateID(job_template_name) ||
      await client.createJobTemplate(new JobTemplate(job_template_name, project_id, playbook));
    console.log(`JobTemplate ${job_template_name} id = ${job_template_id}`);
  }

}



export async function addHostToGroup(client: AwxClient, inventory_name: string, group_name: string, host_name: string) {
  const inventory_id = await client.getInventoryID(inventory_name, true);
  const group_id = await client.getGroupID(group_name, inventory_id, true);

  let host_id =
    await client.getHostIDFromInventory(host_name, inventory_id) ||
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
}
