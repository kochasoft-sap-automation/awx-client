// Copyright (c) 2023 Kochasoft, inc. All rights reserved.

import { AwxClient } from "./client";
import { AwxConfig, Group, Inventory, JobTemplate, Project } from "./entities";
import { addHostToGroup, launchJobTemplate, setupAwx, ChangeUserPassowrd } from "./helper";


async function main() {
  let config: AwxConfig = new AwxConfig();

  // AWX host and credentials.
  config.awx_host = "http://52.116.120.232";
  config.awx_username = "admin";
  config.awx_password = "root";

  // Credential for the ansible repo.
  config.credential_name = "ansible-repo-token";
  config.credential_username = "thakee-kochasoft";
  config.credential_token = "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";

  // Project from ansible repo.
  config.project_name = "ansible-jobs";
  config.project_repo = "https://github.com/kochasoft-sap-automation/ansible-jobs.git";
  config.project_branch = "main";

  // Inventory.
  config.inventories = {
    s4hana : [
      "ASCS",
      "PAS",
      "AAS",
      "ERS",
      "HANA",
    ],
    netweaver: [
      "ASCS",
      "PAS",
      "AAS",
      "DB2",
    ],
    farzan : [
      "ML",
      "DL",
    ]
  }

  let client: AwxClient = new AwxClient(
    config.awx_host,
    config.awx_username,
    config.awx_password,
  );

  // Setup the Awx server with the project, inventory, grups and create templates.
  // Note that it'll create template for all the playbook exists on the project.
  // await setupAwx(client, config);

  // await addHostToGroup(client, "s4hana", "PAS", "abc");

  // await launchJobTemplate(client, "sap-db2-db", "s4hana", {
  //   foo : "bar",
  //   baz : 42,
  // });

  // await ChangeUserPassowrd(client,"root123");
}



main();
