/* exported env, setEnv, checkCoCPassphrase, doAllRequests */
"use strict";

const env = PropertiesService.getUserProperties().getProperties();

const setEnv = (envJSON, confirmation) => {
  const newEnv = JSON.parse(envJSON);
  if (!confirmation) {
	const oldEnvKeys = Object.keys(env);
    const removedEnv = Object.keys(newEnv).filter((envKey) => !oldEnvKeys.includes(envKey));
    if (removedEnv) {
      const removedEnvStr =
        removedEnv.length > 1
          ? `s ${removedEnv.slice(0, -1).join(", ")} and ${removedEnv.at(-1)}`
          : ` ${removedEnv[0]}`;
      console.error(
        `This action will delete the environment variable${removedEnvStr} without replacement. Please confirm by passing true to confirmation (2nd arg)`,
      );
    } else {
      PropertiesService.getUserProperties().setProperties(
        JSON.parse(envJSON),
        true,
      );
    }
  } else {
    PropertiesService.getUserProperties().setProperties(
      JSON.parse(envJSON),
      true,
    );
  }
};

const checkCoCPassphrase = (passphrase, inviteeEmail) => {
  const correctPassphrase = passphrase.trim().toLowerCase() === env.PASSPHRASE;
  if (!correctPassphrase) {
    console.error(`${inviteeEmail} has incorrect Code of Conduct passphrase.`);
  }
  return correctPassphrase;
};

const doAllRequests = (requests) => {
  for (const response of UrlFetchApp.fetchAll(requests)) {
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      console.error(`ERROR ${responseCode}: ${response.getContentText()}`);
    }
  }
};
