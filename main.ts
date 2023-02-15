// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import { AwxClient } from "./client";
import { Group, Inventory, JobTemplate, Project } from "./entities";


// AWX host and credentials.
const awx_host = "http://52.116.120.232";
const awx_username = "admin";
const awx_password = "root";

// Credential for the ansible repo.
const credential_name = "ansible-repo-token";
const credential_username = "thakee-kochasoft";
const credential_token = "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";

// Project from ansible repo.
const project_name = "ansible-jobs";
const project_repo = "https://github.com/kochasoft-sap-automation/ansible-jobs.git";
const project_branch = "main";

// Inventory.
const inventory_name = "sap-workload-farzan-5";
const inventory_description = "An inventory of all the SAP workload VMs.";

// Groups.
const group_names = [
  "ASCS0",
  "PAS",
  "AAS",
  "ERS",
  "HANA",
];


// --------------------------------------------------------------------------
// Nothing to change bellow here
// --------------------------------------------------------------------------


async function main() {

  let client: AwxClient = new AwxClient(
    awx_host,
    awx_username,
    awx_password,
  );

  // Setup the Awx server with the project, inventory, grups and create templates.
  // Note that it'll create template for all the playbook exists on the project.
  await setupAwx(client);

  // Add hosts to groups. We call this functions after a VM created.
  await addHostToGroup(client, "PAS", "10.123.5.5");
  await addHostToGroup(client, "AAS", "10.123.4.5");
  await addHostToGroup(client, "HANA", "my-host-4");
  await addHostToGroup(client, "ERS",  "my-host-5");

}


async function setupAwx(client: AwxClient) {

  // TODO: Variablize the org name and create if it's not exists already.
  const organization_name = "Default";
  const organization_id = await client.getOrganizationID(organization_name, true);
  console.log(`Organization ${organization_name} id = ${organization_id}`);


  // Create credential if it's not already exists, possible if the last run of
  // this script failed and we run this again.
  const credential_id =
    await client.getCredentialID(credential_name) ||
    await client.createScmCredential(credential_name, credential_username, credential_token);
  console.log(`Credential ${credential_name} id = ${credential_id}`);


  // Create project if it's not already exists. Otherwise we can re-use the repo.
  const project_id =
    await client.getProjectID(project_name) ||
    await client.createProject(new Project(project_name, credential_id, project_repo, project_branch));
  console.log(`Project ${project_name} id = ${project_id}`);
  

  // Create inventory if not exists.
  const inventory_id =
    await client.getInventoryID(inventory_name) ||
    await client.createInventory(new Inventory(inventory_name, organization_id, inventory_description));
  console.log(`Inventory ${project_name} id = ${inventory_id}`);
  
  
  // Create The groups in the above inventory.
  for (let group_name of group_names) {
    const group_id =
      await client.getGroupID(group_name, inventory_id) ||
      await client.createGroup(new Group(group_name, inventory_id));
    console.log(`Group ${group_name} id = ${group_id}`);
  }


  // Create Job template for all the playbooks in the project.
  for (let playbook of await client.getPlaybooks(project_id)) {

    const job_template_name = playbook.replace(".yml", "").replaceAll("_", "-");

    const job_template_id =
      await client.getJobTemplateID(job_template_name) ||
      await client.createJobTemplate(new JobTemplate(job_template_name, inventory_id, project_id, playbook));
    console.log(`JobTemplate ${job_template_name} id = ${job_template_id}`);
  }
  
}


async function addHostToGroup(client: AwxClient, group_name: string, host_name: string) {
  const inventory_id = await client.getInventoryID(inventory_name, true);
  const group_id = await client.getGroupID(group_name, inventory_id, true);
  
  const host_id = 
    await client.getHostIDFromInventory(host_name, inventory_id) ||
    await client.createHostInInventory(host_name, inventory_id);

  
  await client.getHostIDFromGroup(host_name, group_id) || // Checks if the host is already added to the group.
  await client.addHostToGroup(host_name, group_id, inventory_id); // If host is not added to the group this will add the host.
  console.log(`Host ${host_name} id = ${host_id}`);

}


main();
